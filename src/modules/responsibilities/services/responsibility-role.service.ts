import type { Guild, GuildMember } from "discord.js";
import type { RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import type { ResponsibilityAssignment } from "../models/responsibility-assignment.model.ts";
import { responsibilityAssignmentRepository } from "../repositories/responsibility-assignment.repository.ts";
import { responsibilityLogService } from "./responsibility-log.service.ts";

const log = logger.child("responsibilities:roles");
const L = responsibilityMessages.log;

export type RoleState = "OK" | "MISSING" | "UNMANAGEABLE";

export class ResponsibilityRoleService {
  roleState(guild: Guild, roleId: RoleId): RoleState {
    const role = guild.roles.cache.get(roleId);
    if (!role) return "MISSING";
    const me = guild.members.me;
    if (!me || role.managed || me.roles.highest.comparePositionTo(role) <= 0) return "UNMANAGEABLE";
    return "OK";
  }

  async grant(member: GuildMember, roleId: RoleId, reason: string): Promise<void> {
    if (member.roles.cache.has(roleId)) return;
    await member.roles.add(roleId, reason);
  }

  async release(
    guild: Guild,
    assignment: Pick<ResponsibilityAssignment, "assignmentId" | "userId" | "roleId" | "roleGranted">,
    title: string,
    reason: string,
  ): Promise<void> {
    if (!assignment.roleGranted) return;
    const stillNeeded = await responsibilityAssignmentRepository.otherActiveWithRole(
      guild.id,
      assignment.userId,
      assignment.roleId,
      assignment.assignmentId,
    );
    if (stillNeeded) return;

    const state = this.roleState(guild, assignment.roleId);
    if (state !== "OK") {
      await responsibilityLogService.post(guild, {
        kind: "PROBLEM",
        userId: assignment.userId,
        title,
        roleId: assignment.roleId,
        note: state === "MISSING" ? L.roleMissingNote : L.roleUnmanageableNote,
      });
      return;
    }

    const member = await guild.members.fetch(assignment.userId).catch(() => null);
    if (!member?.roles.cache.has(assignment.roleId)) return;
    await member.roles
      .remove(assignment.roleId, reason)
      .catch((err) => log.warn(`removing responsibility role from ${assignment.userId} failed`, err));
  }
}

export const responsibilityRoleService = new ResponsibilityRoleService();
