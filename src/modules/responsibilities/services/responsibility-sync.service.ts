import { AuditLogEvent, type Guild, type GuildMember, type PartialGuildMember } from "discord.js";
import type { RoleId, UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { responsibilityAssignmentRepository } from "../repositories/responsibility-assignment.repository.ts";
import { responsibilityRepository } from "../repositories/responsibility.repository.ts";
import { ResponsibilityAssignmentStatus } from "../types/enums.ts";
import { responsibilityAssignmentService } from "./responsibility-assignment.service.ts";
import { responsibilityLogService } from "./responsibility-log.service.ts";
import { responsibilityPermissionService } from "./responsibility-permission.service.ts";
import { responsibilityRoleService } from "./responsibility-role.service.ts";

const log = logger.child("responsibilities:sync");
const MANUAL = "MANUAL";
const AUDIT_LOOKBACK_MS = 15_000;

export class ResponsibilitySyncService {
  /**
   * Mirrors manual role edits into the DB. The bot's own grants/removals never reach
   * the DB here: it writes the assignment before granting and closes it before removing.
   */
  async handleMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<number> {
    if (oldMember.partial || newMember.user.bot) return 0;
    const removed = [...oldMember.roles.cache.keys()].filter((id) => !newMember.roles.cache.has(id));
    const added = [...newMember.roles.cache.keys()].filter((id) => !oldMember.roles.cache.has(id));
    if (removed.length === 0 && added.length === 0) return 0;

    try {
      let changed = 0;
      for (const roleId of removed) changed += await this.closeForRemovedRole(newMember, roleId);
      for (const roleId of added) changed += await this.openForAddedRole(newMember, roleId);
      if (changed > 0) responsibilityPermissionService.invalidate(newMember.guild.id, newMember.id);
      return changed;
    } catch (err) {
      log.warn(`responsibility role sync failed for ${newMember.id} in ${newMember.guild.id}`, err);
      return 0;
    }
  }

  handleMemberJoin(member: GuildMember): Promise<number> {
    return this.restore(member);
  }

  private async closeForRemovedRole(member: GuildMember, roleId: RoleId): Promise<number> {
    const active = await responsibilityAssignmentRepository.activeFor(member.guild.id, member.id);
    const matching = active.filter((a) => a.roleId === roleId);
    if (matching.length === 0) return 0;

    const actorId = await this.resolveRoleEditor(member.guild, member.id, roleId, "$remove");
    let closed = 0;
    for (const assignment of matching) {
      const done = await responsibilityAssignmentRepository.close(
        assignment.assignmentId,
        ResponsibilityAssignmentStatus.REMOVED,
        actorId ?? MANUAL,
      );
      if (!done) continue;
      closed += 1;
      const responsibility = await responsibilityRepository.byIdIncludingDisabled(member.guild.id, done.responsibilityId);
      await responsibilityLogService.post(member.guild, {
        kind: "REMOVED",
        userId: member.id,
        title: responsibility?.title ?? done.responsibilityId,
        roleId,
        actorId,
        note: responsibilityMessages.log.manualRemovedNote,
      });
    }
    return closed;
  }

  private async openForAddedRole(member: GuildMember, roleId: RoleId): Promise<number> {
    const responsibility = await responsibilityRepository.byRole(member.guild.id, roleId);
    if (!responsibility) return 0;
    if (await responsibilityAssignmentRepository.activeOf(member.guild.id, member.id, responsibility.responsibilityId)) {
      return 0;
    }

    const actorId = await this.resolveRoleEditor(member.guild, member.id, roleId, "$add");
    const now = new Date();
    const expiresAt =
      responsibility.isTemporary && responsibility.defaultDuration
        ? new Date(now.getTime() + responsibility.defaultDuration)
        : null;

    try {
      await responsibilityAssignmentRepository.insert({
        guildId: member.guild.id,
        responsibilityId: responsibility.responsibilityId,
        userId: member.id,
        roleId,
        roleGranted: true,
        assignedBy: actorId ?? MANUAL,
        assignedAt: now,
        expiresAt,
        status: ResponsibilityAssignmentStatus.ACTIVE,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) return 0;
      throw err;
    }

    await responsibilityLogService.post(member.guild, {
      kind: "ASSIGNED",
      userId: member.id,
      title: responsibility.title,
      roleId,
      actorId,
      expiresAt,
      note: responsibilityMessages.log.manualAddedNote,
    });
    return 1;
  }

  private async resolveRoleEditor(
    guild: Guild,
    targetId: UserId,
    roleId: RoleId,
    change: "$add" | "$remove",
  ): Promise<UserId | null> {
    try {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 10 });
      const entry = logs.entries.find(
        (e) =>
          e.targetId === targetId &&
          Date.now() - e.createdTimestamp < AUDIT_LOOKBACK_MS &&
          e.changes.some(
            (c) => c.key === change && Array.isArray(c.new) && c.new.some((r) => (r as { id?: string }).id === roleId),
          ),
      );
      return entry?.executor?.id ?? null;
    } catch {
      return null;
    }
  }

  private async restore(member: GuildMember): Promise<number> {
    try {
      const active = await responsibilityAssignmentService.getActiveResponsibilities(member.guild.id, member.id);
      let restored = 0;
      for (const { responsibility } of active) {
        const roleId = responsibility.roleId;
        if (member.roles.cache.has(roleId)) continue;
        if (responsibilityRoleService.roleState(member.guild, roleId) !== "OK") continue;
        await responsibilityRoleService.grant(member, roleId, "Active responsibility — role restored");
        restored += 1;
      }
      return restored;
    } catch (err) {
      log.warn(`responsibility role restore failed for ${member.id} in ${member.guild.id}`, err);
      return 0;
    }
  }
}

export const responsibilitySyncService = new ResponsibilitySyncService();
