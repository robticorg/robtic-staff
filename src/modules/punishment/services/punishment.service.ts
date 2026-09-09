import { PermissionFlagsBits, type Guild, type GuildMember, type User } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, MongoFilter, UserId } from "../../../shared/types/index.ts";
import { DomainError, NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { EVIDENCE_WINDOW_MS } from "../../../data/config/punishment.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { userWarningService } from "../../warnings/services/user-warning.service.ts";
import { PunishmentModel, type Punishment } from "../models/punishment.model.ts";
import {
  PunishmentAuditAction,
  PunishmentStatus,
  PunishmentType,
  assertPunishmentTransition,
  isDirectPunishment,
  requiresApproval,
} from "../types/enums.ts";
import { clampTimeout } from "./duration.service.ts";
import { punishmentAuditService } from "./punishment-audit.service.ts";
import {
  botHasPermission,
  botOutranks,
  configuredRoleId,
  requiredBotPermission,
} from "./punishment-permissions.ts";
import { requirePunishmentClient } from "../runtime.ts";

const log = logger.child("punishment");
const M = punishmentMessages.resolution;

export class PunishmentExecutionError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message);
  }
}

export interface CreatePunishmentInput {
  guildId: GuildId;
  userId: UserId;
  type: PunishmentType;
  reason: string;
  evidence?: string[];
  reportId?: string;
  issuedBy: UserId;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ExecuteContext {
  guild: Guild;
  target: GuildMember | null;
  targetUser: User | null;
  executorId: UserId;
}

export interface ExecuteResult {
  punishment: PunishmentDoc;
  executed: boolean;
  failureReason?: string;
}

export interface ReversalResult {
  punishment: PunishmentDoc;
  reversed: boolean;
  alreadyRevoked: boolean;
  discordReversed: boolean;
  reversalError?: string;
}

type PunishmentDoc = HydratedDocument<Punishment>;

export class PunishmentService extends BaseRepository<Punishment> {
  constructor() {
    super(PunishmentModel);
  }

  getPunishment(punishmentId: string): Promise<PunishmentDoc | null> {
    return this.findOne({ punishmentId });
  }

  async getPunishmentOrThrow(punishmentId: string): Promise<PunishmentDoc> {
    const p = await this.getPunishment(punishmentId);
    if (!p) throw new NotFoundError("punishment", { punishmentId });
    return p;
  }

  getById(id: IdLike): Promise<PunishmentDoc | null> {
    return this.findById(id);
  }

  getUserPunishments(userId: UserId, guildId: GuildId): Promise<PunishmentDoc[]> {
    return this.model.find({ userId, guildId }).sort({ createdAt: -1 }).exec();
  }

  async getUserRecentPunishment(
    userId: UserId,
    guildId: GuildId,
  ): Promise<{
    punishment: PunishmentDoc;
    evidenceAvailable: boolean;
    canAppeal: boolean;
  } | null> {
    const punishment = await this.model
      .findOne({
        userId,
        guildId,
        status: { $in: [PunishmentStatus.EXECUTED, PunishmentStatus.APPROVED] },
        type: { $ne: PunishmentType.NO_ACTION },
      })
      .sort({ executedAt: -1, createdAt: -1 })
      .exec();
    if (!punishment) return null;

    const evidenceAvailable =
      !!punishment.evidenceAvailableUntil && punishment.evidenceAvailableUntil.getTime() > Date.now();
    return { punishment, evidenceAvailable, canAppeal: true };
  }

  async createPunishment(input: CreatePunishmentInput): Promise<PunishmentDoc> {
    if (input.type !== PunishmentType.NO_ACTION && !input.reason?.trim()) {
      throw new ValidationError(M.reasonRequired);
    }
    if (input.userId === input.issuedBy) {
      throw new PunishmentExecutionError("PUNISH_SELF", M.targetIsSelf);
    }

    const doc = await this.insert({
      guildId: input.guildId,
      userId: input.userId,
      type: input.type,
      status: PunishmentStatus.PENDING,
      reason: (input.reason ?? "").trim(),
      evidence: input.evidence ?? [],
      reportId: input.reportId,
      issuedBy: input.issuedBy,
      duration: input.durationMs,
      metadata: input.metadata,
    });

    await punishmentAuditService.record({
      punishmentId: doc.punishmentId,
      action: PunishmentAuditAction.CREATED,
      actorId: input.issuedBy,
      metadata: { type: input.type },
    });
    return doc;
  }

  private async setStatus(
    punishmentId: string,
    to: PunishmentStatus,
    extra: Partial<Punishment> = {},
  ): Promise<PunishmentDoc> {
    const current = await this.getPunishmentOrThrow(punishmentId);
    assertPunishmentTransition(current.status, to);
    const updated = await this.updateOne(
      { punishmentId, status: current.status },
      { $set: { status: to, ...extra } },
    );
    if (!updated) throw new DomainError("PUNISH_RACE", "تغيّرت حالة العقوبة — جرب مرة ثانية.");
    return updated;
  }

  async markApprovalRequested(punishmentId: string): Promise<PunishmentDoc> {
    const updated = await this.setStatus(punishmentId, PunishmentStatus.APPROVAL);
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.APPROVAL_REQUESTED,
    });
    return updated;
  }

  async markApproved(punishmentId: string, approvedBy: UserId): Promise<PunishmentDoc> {
    const updated = await this.setStatus(punishmentId, PunishmentStatus.APPROVED, { approvedBy });
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.APPROVED,
      actorId: approvedBy,
    });
    return updated;
  }

  async markRejected(
    punishmentId: string,
    rejectedBy: UserId,
    reason?: string,
  ): Promise<PunishmentDoc> {
    const updated = await this.setStatus(punishmentId, PunishmentStatus.REJECTED, {
      approvedBy: undefined,
      rejectionReason: reason,
    });
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.REJECTED,
      actorId: rejectedBy,
      metadata: { reason },
    });
    return updated;
  }

  async markExpired(punishmentId: string): Promise<PunishmentDoc> {
    const updated = await this.setStatus(punishmentId, PunishmentStatus.EXPIRED);
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.EXPIRED,
    });
    return updated;
  }

  async revokePunishment(punishmentId: string, actorId: UserId): Promise<PunishmentDoc> {
    const updated = await this.setStatus(punishmentId, PunishmentStatus.REVOKED, {
      revokedAt: new Date(),
      revokedBy: actorId,
    });
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.REVOKED,
      actorId,
    });
    return updated;
  }

  async reversePunishment(
    punishmentId: string,
    input: { actorId: UserId; reason: string; appealId?: string },
  ): Promise<ReversalResult> {
    const punishment = await this.getPunishmentOrThrow(punishmentId);

    if (punishment.status === PunishmentStatus.REVOKED) {
      return { punishment, reversed: false, alreadyRevoked: true, discordReversed: true };
    }
    if (punishment.status !== PunishmentStatus.EXECUTED) {
      throw new DomainError(
        "PUNISH_NOT_REVERSIBLE",
        "العقوبة اللي تم تنفيذها بس تقدر تتلغى.",
        { status: punishment.status },
      );
    }

    let discordReversed = true;
    let reversalError: string | undefined;
    try {
      await this.performReversal(punishment, input.actorId, input.reason);
    } catch (err) {
      discordReversed = false;
      reversalError = err instanceof Error ? err.message : String(err);
      log.warn(`punishment ${punishmentId} discord reversal failed`, err);
      await punishmentAuditService.record({
        punishmentId,
        action: PunishmentAuditAction.REVERSAL_FAILED,
        actorId: input.actorId,
        error: reversalError,
      });
    }

    const updated = await this.setStatus(punishmentId, PunishmentStatus.REVOKED, {
      revokedBy: input.actorId,
      revokedAt: new Date(),
      revocationReason: input.reason,
      appealId: input.appealId,
    });
    if (reversalError) {
      await this.updateOne(
        { punishmentId },
        { $set: { "metadata.reversalError": reversalError } },
      ).catch(() => undefined);
    }
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.REVOKED,
      actorId: input.actorId,
      metadata: { appealId: input.appealId, reason: input.reason },
    });

    return { punishment: updated, reversed: true, alreadyRevoked: false, discordReversed, reversalError };
  }

  private async performReversal(
    punishment: Punishment,
    actorId: UserId,
    reason: string,
  ): Promise<void> {
    const auditReason = `Appeal reversal: ${reason}`.slice(0, 400);
    const guild = requirePunishmentClient().guilds.cache.get(punishment.guildId) ?? null;

    switch (punishment.type) {
      case PunishmentType.WARN: {
        const warningId =
          typeof punishment.metadata?.warningId === "string"
            ? punishment.metadata.warningId
            : null;
        if (warningId) {
          await userWarningService.revoke({
            warningId,
            revokedBy: actorId,
            revokeReason: reason,
          });
        }
        return;
      }
      case PunishmentType.TIMEOUT: {
        if (!guild) return;
        const member = await guild.members.fetch(punishment.userId).catch(() => null);
        if (member?.communicationDisabledUntil) await member.timeout(null, auditReason);
        return;
      }
      case PunishmentType.MUTE:
      case PunishmentType.JAIL: {
        if (!guild) return;
        const member = await guild.members.fetch(punishment.userId).catch(() => null);
        if (!member) return;
        const roleId = await configuredRoleId(
          guild.id,
          punishment.type === PunishmentType.MUTE ? RoleConfigType.MUTE : RoleConfigType.JAIL,
        );
        if (roleId && member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId, auditReason);
        }
        return;
      }
      case PunishmentType.KICK:
        return;
      case PunishmentType.BAN: {
        if (!guild) return;
        if (!botHasPermission(guild, PermissionFlagsBits.BanMembers)) {
          throw new PunishmentExecutionError(
            "BOT_MISSING_PERM",
            "I don't have the Ban Members permission to unban this user.",
          );
        }
        try {
          await guild.bans.remove(punishment.userId, auditReason);
        } catch (err) {
          if (String(err).includes("Unknown Ban")) return;
          throw err;
        }
        return;
      }
      default:
        return;
    }
  }

  async executeAction(punishment: PunishmentDoc, ctx: ExecuteContext): Promise<ExecuteResult> {
    if (punishment.status !== PunishmentStatus.PENDING && punishment.status !== PunishmentStatus.APPROVED) {
      throw new DomainError("PUNISH_BAD_STATE", "هذه العقوبة ما عاد يمكن تنفيذها.");
    }

    if (punishment.type === PunishmentType.NO_ACTION) {
      const done = await this.finishExecuted(punishment.punishmentId, ctx.executorId, undefined);
      return { punishment: done, executed: true };
    }

    try {
      await this.preflight(punishment, ctx);
      const expiresAt = await this.performDiscordAction(punishment, ctx);
      const done = await this.finishExecuted(punishment.punishmentId, ctx.executorId, expiresAt);
      return { punishment: done, executed: true };
    } catch (err) {
      const reason =
        err instanceof PunishmentExecutionError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      const failed = await this.finishFailed(punishment.punishmentId, reason);
      log.warn(`punishment ${punishment.punishmentId} execution failed`, err);
      return { punishment: failed, executed: false, failureReason: reason };
    }
  }

  private async preflight(punishment: Punishment, ctx: ExecuteContext): Promise<void> {
    const perm = requiredBotPermission(punishment.type);
    if (perm && !botHasPermission(ctx.guild, perm)) {
      throw new PunishmentExecutionError(
        "BOT_MISSING_PERM",
        M.botMissingPermission(permName(punishment.type)),
      );
    }

    const needsMember =
      punishment.type === PunishmentType.TIMEOUT ||
      punishment.type === PunishmentType.MUTE ||
      punishment.type === PunishmentType.JAIL ||
      punishment.type === PunishmentType.KICK;

    if (needsMember) {
      if (!ctx.target) {
        throw new PunishmentExecutionError(
          "TARGET_NOT_IN_GUILD",
          punishment.type === PunishmentType.KICK ? M.targetLeftForKick : M.targetNotInGuild,
        );
      }
      if (!botOutranks(ctx.guild, ctx.target)) {
        throw new PunishmentExecutionError("HIERARCHY", M.roleHierarchy);
      }
    }
    if (punishment.type === PunishmentType.BAN && ctx.target && !botOutranks(ctx.guild, ctx.target)) {
      throw new PunishmentExecutionError("HIERARCHY", M.roleHierarchy);
    }
  }

  private async performDiscordAction(
    punishment: Punishment,
    ctx: ExecuteContext,
  ): Promise<Date | undefined> {
    const reason = `Punishment ${punishment.punishmentId}: ${punishment.reason}`.slice(0, 500);

    switch (punishment.type) {
      case PunishmentType.TIMEOUT: {
        const ms = clampTimeout(punishment.duration ?? 0);
        await ctx.target!.timeout(ms, reason);
        return new Date(Date.now() + ms);
      }
      case PunishmentType.MUTE:
      case PunishmentType.JAIL: {
        const roleType =
          punishment.type === PunishmentType.MUTE ? RoleConfigType.MUTE : RoleConfigType.JAIL;
        const roleId = await configuredRoleId(ctx.guild.id, roleType);
        if (!roleId || !ctx.guild.roles.cache.has(roleId)) {
          throw new PunishmentExecutionError(
            "ROLE_NOT_CONFIGURED",
            M.roleNotConfigured(punishment.type === PunishmentType.MUTE ? "Mute" : "Jail"),
          );
        }
        await ctx.target!.roles.add(roleId, reason);
        return undefined;
      }
      case PunishmentType.KICK: {
        await ctx.target!.kick(reason);
        return undefined;
      }
      case PunishmentType.BAN: {
        await ctx.guild.bans.create(punishment.userId, { reason });
        return undefined;
      }
      default:
        return undefined;
    }
  }

  private async finishExecuted(
    punishmentId: string,
    executedBy: UserId,
    expiresAt: Date | undefined,
  ): Promise<PunishmentDoc> {
    const now = new Date();
    const updated = await this.setStatus(punishmentId, PunishmentStatus.EXECUTED, {
      executedBy,
      executedAt: now,
      expiresAt,
      evidenceAvailableUntil: new Date(now.getTime() + EVIDENCE_WINDOW_MS),
    });
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.EXECUTED,
      actorId: executedBy,
    });
    return updated;
  }

  private async finishFailed(punishmentId: string, error: string): Promise<PunishmentDoc> {
    const updated = await this.setStatus(punishmentId, PunishmentStatus.FAILED, {
      failureReason: error.slice(0, 2000),
    });
    await punishmentAuditService.record({
      punishmentId,
      action: PunishmentAuditAction.FAILED,
      error,
    });
    return updated;
  }

  isDirect(type: PunishmentType): boolean {
    return isDirectPunishment(type);
  }
  needsApproval(type: PunishmentType): boolean {
    return requiresApproval(type);
  }

  list(guildId: GuildId, filter: MongoFilter<Punishment> = {}): Promise<PunishmentDoc[]> {
    return this.model.find({ guildId, ...filter }).sort({ createdAt: -1 }).exec();
  }
}

function permName(type: PunishmentType): string {
  switch (type) {
    case PunishmentType.TIMEOUT:
      return "Moderate Members";
    case PunishmentType.MUTE:
    case PunishmentType.JAIL:
      return "Manage Roles";
    case PunishmentType.KICK:
      return "Kick Members";
    case PunishmentType.BAN:
      return "Ban Members";
    default:
      return "—";
  }
}

export const punishmentService = new PunishmentService();
