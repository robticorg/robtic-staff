import type { Guild, GuildMember } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import type { ResponsibilityAssignmentDocument } from "../models/responsibility-assignment.model.ts";
import type { ResponsibilityDocument } from "../models/responsibility.model.ts";
import { responsibilityAssignmentRepository } from "../repositories/responsibility-assignment.repository.ts";
import { responsibilityRepository } from "../repositories/responsibility.repository.ts";
import { ResponsibilityError } from "../shared/responsibility-error.ts";
import { ResponsibilityAssignmentStatus } from "../types/enums.ts";
import { responsibilityAuthorizationService } from "./responsibility-authorization.service.ts";
import { responsibilityLogService } from "./responsibility-log.service.ts";
import { responsibilityPermissionService } from "./responsibility-permission.service.ts";
import { responsibilityRoleService } from "./responsibility-role.service.ts";

const log = logger.child("responsibilities:assignment");
const E = responsibilityMessages.errors;
const SYSTEM = "SYSTEM";

export interface ActiveResponsibility {
  assignment: ResponsibilityAssignmentDocument;
  responsibility: ResponsibilityDocument;
}

export class ResponsibilityAssignmentService {
  async assignResponsibility(input: {
    guild: Guild;
    executor: GuildMember;
    targetId: UserId;
    responsibilityId: string;
    now?: Date;
    preauthorized?: boolean;
  }): Promise<ActiveResponsibility> {
    const { guild, executor } = input;
    const target = await guild.members.fetch(input.targetId).catch(() => null);
    if (!target) throw new ResponsibilityError("RESP_TARGET_GONE", E.targetGone);
    if (target.user.bot) throw new ResponsibilityError("RESP_TARGET_BOT", E.targetBot);

    const responsibility = await responsibilityRepository.byId(guild.id, input.responsibilityId);
    if (!responsibility) throw new ResponsibilityError("RESP_NOT_FOUND", E.notFound);

    if (!input.preauthorized && !(await responsibilityAuthorizationService.canAssign(executor, target.id, responsibility))) {
      throw new ResponsibilityError(
        executor.id === target.id ? "RESP_SELF" : "RESP_FORBIDDEN",
        executor.id === target.id ? E.self : E.notAllowed,
      );
    }

    if (await responsibilityAssignmentRepository.activeOf(guild.id, target.id, responsibility.responsibilityId)) {
      throw new ResponsibilityError("RESP_ALREADY", responsibilityMessages.assign.already);
    }

    const state = responsibilityRoleService.roleState(guild, responsibility.roleId);
    if (state === "MISSING") throw new ResponsibilityError("RESP_ROLE_MISSING", E.roleMissing);
    if (state === "UNMANAGEABLE") throw new ResponsibilityError("RESP_ROLE_UNMANAGEABLE", E.roleUnmanageable);

    const now = input.now ?? new Date();
    const expiresAt =
      responsibility.isTemporary && responsibility.defaultDuration
        ? new Date(now.getTime() + responsibility.defaultDuration)
        : null;

    let assignment: ResponsibilityAssignmentDocument;
    try {
      assignment = await responsibilityAssignmentRepository.insert({
        guildId: guild.id,
        responsibilityId: responsibility.responsibilityId,
        userId: target.id,
        roleId: responsibility.roleId,
        roleGranted: !target.roles.cache.has(responsibility.roleId),
        assignedBy: executor.id,
        assignedAt: now,
        expiresAt,
        status: ResponsibilityAssignmentStatus.ACTIVE,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new ResponsibilityError("RESP_ALREADY", responsibilityMessages.assign.already);
      throw err;
    }

    try {
      await responsibilityRoleService.grant(target, responsibility.roleId, `Responsibility ${responsibility.title} by ${executor.id}`);
    } catch (err) {
      log.warn(`granting responsibility role to ${target.id} failed`, err);
      await responsibilityAssignmentRepository.close(assignment.assignmentId, ResponsibilityAssignmentStatus.REMOVED, SYSTEM);
      throw new ResponsibilityError("RESP_ROLE_FAILED", E.roleFailed);
    }

    responsibilityPermissionService.invalidate(guild.id, target.id);
    await responsibilityLogService.post(guild, {
      kind: "ASSIGNED",
      userId: target.id,
      title: responsibility.title,
      roleId: responsibility.roleId,
      actorId: executor.id,
      expiresAt,
    });
    return { assignment, responsibility };
  }

  async removeResponsibility(input: {
    guild: Guild;
    executor: GuildMember;
    assignmentId: string;
    targetId?: UserId;
  }): Promise<ActiveResponsibility> {
    const { guild, executor } = input;
    const assignment = await responsibilityAssignmentRepository.byId(guild.id, input.assignmentId);
    if (
      !assignment ||
      assignment.status !== ResponsibilityAssignmentStatus.ACTIVE ||
      (input.targetId !== undefined && assignment.userId !== input.targetId)
    ) {
      throw new ResponsibilityError("RESP_NOT_ACTIVE", responsibilityMessages.remove.notActive);
    }
    const responsibility = await responsibilityRepository.byIdIncludingDisabled(guild.id, assignment.responsibilityId);
    if (!responsibility) throw new ResponsibilityError("RESP_NOT_FOUND", E.notFound);

    if (!(await responsibilityAuthorizationService.canAssign(executor, assignment.userId, responsibility))) {
      throw new ResponsibilityError("RESP_FORBIDDEN", executor.id === assignment.userId ? E.self : E.notAllowed);
    }

    const closed = await responsibilityAssignmentRepository.close(
      assignment.assignmentId,
      ResponsibilityAssignmentStatus.REMOVED,
      executor.id,
    );
    if (!closed) throw new ResponsibilityError("RESP_NOT_ACTIVE", responsibilityMessages.remove.notActive);

    responsibilityPermissionService.invalidate(guild.id, closed.userId);
    await responsibilityRoleService.release(guild, closed, responsibility.title, `Responsibility removed by ${executor.id}`);
    await responsibilityLogService.post(guild, {
      kind: "REMOVED",
      userId: closed.userId,
      title: responsibility.title,
      roleId: closed.roleId,
      actorId: executor.id,
    });
    return { assignment: closed, responsibility };
  }

  async expireResponsibility(
    guild: Guild,
    assignment: ResponsibilityAssignmentDocument,
    now: Date = new Date(),
  ): Promise<boolean> {
    if (!assignment.expiresAt || assignment.expiresAt.getTime() > now.getTime()) return false;
    const closed = await responsibilityAssignmentRepository.close(
      assignment.assignmentId,
      ResponsibilityAssignmentStatus.EXPIRED,
      SYSTEM,
      now,
    );
    if (!closed) return false;

    const responsibility = await responsibilityRepository.byIdIncludingDisabled(guild.id, closed.responsibilityId);
    const title = responsibility?.title ?? closed.responsibilityId;
    responsibilityPermissionService.invalidate(guild.id, closed.userId);
    await responsibilityRoleService.release(guild, closed, title, "Temporary responsibility expired");
    await responsibilityLogService.post(guild, {
      kind: "EXPIRED",
      userId: closed.userId,
      title,
      roleId: closed.roleId,
      expiresAt: closed.expiresAt ?? null,
    });
    return true;
  }

  async getActiveResponsibilities(guildId: GuildId, userId: UserId): Promise<ActiveResponsibility[]> {
    const assignments = await responsibilityAssignmentRepository.activeFor(guildId, userId);
    const responsibilities = await responsibilityRepository.listByIds(
      guildId,
      assignments.map((a) => a.responsibilityId),
    );
    const byId = new Map(responsibilities.map((r) => [r.responsibilityId, r]));
    return assignments
      .map((assignment) => ({ assignment, responsibility: byId.get(assignment.responsibilityId) }))
      .filter((row): row is ActiveResponsibility => !!row.responsibility && !row.responsibility.disabled);
  }

  getUserResponsibilities(guildId: GuildId, userId: UserId): Promise<ResponsibilityAssignmentDocument[]> {
    return responsibilityAssignmentRepository.historyFor(guildId, userId);
  }

  async assignableFor(guild: Guild, executor: GuildMember, targetId: UserId): Promise<ResponsibilityDocument[]> {
    const all = await responsibilityRepository.listEnabled(guild.id);
    const held = new Set(
      (await responsibilityAssignmentRepository.activeFor(guild.id, targetId)).map((a) => a.responsibilityId),
    );
    return responsibilityAuthorizationService.filterAssignable(
      executor,
      targetId,
      all.filter((r) => !held.has(r.responsibilityId)),
    );
  }

  async removableFor(guild: Guild, executor: GuildMember, targetId: UserId): Promise<ActiveResponsibility[]> {
    const active = await this.getActiveResponsibilities(guild.id, targetId);
    const allowed = await responsibilityAuthorizationService.filterAssignable(
      executor,
      targetId,
      active.map((row) => row.responsibility),
    );
    const allowedIds = new Set(allowed.map((r) => r.responsibilityId));
    return active.filter((row) => allowedIds.has(row.responsibility.responsibilityId));
  }
}

export const responsibilityAssignmentService = new ResponsibilityAssignmentService();
