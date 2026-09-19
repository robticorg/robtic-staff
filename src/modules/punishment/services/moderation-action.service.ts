import type { Guild, GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { PunishmentType } from "../types/enums.ts";
import { durationService } from "./duration.service.ts";
import { canJail, type JailDenyReason } from "./jail-authorization.ts";
import { punishmentLogService } from "./punishment-log.service.ts";
import { configuredRoleId } from "./punishment-permissions.ts";
import { punishmentService } from "./punishment.service.ts";

export interface ModerationActionInput {
  guild: Guild;
  target: GuildMember;
  /** The member acting, so hierarchy can be checked — not just their id. */
  actor: GuildMember;
  reason: string;
  evidence: string[];
}

export interface TimeoutActionInput extends ModerationActionInput {
  durationMs: number;
}

export interface ModerationActionResult {
  executed: boolean;
  failureReason?: string;
  punishment: HydratedDocument<Punishment> | null;

  /** Formatted for display — timeout only. */
  duration?: string;

  /** Set when the actor was not allowed to act on this target at all. */
  denied?: JailDenyReason;
}

export interface UnjailResult {
  /**
   * `reversed` — a punishment record was lifted.
   * `role-removed` — no record, but the member held the jail role.
   * `not-jailed` — neither; nothing was changed.
   */
  outcome: "reversed" | "role-removed" | "not-jailed";
  discordReversed?: boolean;
  reversalError?: string;
}

/**
 * The one place a timeout or a jail is carried out, shared by the warning panel
 * and the `!jail` command so neither owns a private copy of the flow.
 *
 * Ordering is enforced by `punishmentService.executeAction`: the record is created
 * PENDING, Discord is called, and only a confirmed call flips it to EXECUTED. A
 * failure lands on FAILED and is reported — nothing is logged as if it worked.
 */
export class ModerationActionService {
  timeout(input: TimeoutActionInput): Promise<ModerationActionResult> {
    return this.run({ ...input, type: PunishmentType.TIMEOUT, durationMs: input.durationMs });
  }

  /**
   * Jail runs the hierarchy check first: staff are not jailed by other staff, and
   * nobody is jailed by someone they outrank. Refused before any record exists.
   */
  async jail(input: ModerationActionInput): Promise<ModerationActionResult> {
    const decision = await canJail(input.actor, input.target);
    if (!decision.allowed) {
      return { executed: false, punishment: null, denied: decision.reason };
    }
    return this.run({ ...input, type: PunishmentType.JAIL });
  }

  /**
   * Lifts a jail. The punishment record is the source of truth, so the normal path
   * reverses it through `reversePunishment` — which removes the configured role and
   * marks the record REVOKED with an audit entry.
   *
   * The fallback exists because a member can hold the jail role without a matching
   * record: jailed by hand, or before the bot managed it. Refusing those would make
   * the command useless exactly when someone needs it, so the role is removed and
   * the result says so rather than pretending a punishment was reversed.
   */
  async unjail(input: {
    guild: Guild;
    target: GuildMember | null;
    targetId: UserId;
    actorId: UserId;
    reason: string;
  }): Promise<UnjailResult> {
    const punishment = await punishmentService.findLatestExecuted(
      input.guild.id,
      input.targetId,
      PunishmentType.JAIL,
    );

    if (punishment) {
      const result = await punishmentService.reversePunishment(punishment.punishmentId, {
        actorId: input.actorId,
        reason: input.reason,
      });
      await punishmentLogService.record(result.punishment);
      return {
        outcome: "reversed",
        discordReversed: result.discordReversed,
        reversalError: result.reversalError,
      };
    }

    const roleId = await configuredRoleId(input.guild.id, RoleConfigType.JAIL);
    if (roleId && input.target?.roles.cache.has(roleId)) {
      await input.target.roles.remove(roleId, input.reason);
      return { outcome: "role-removed", discordReversed: true };
    }

    return { outcome: "not-jailed" };
  }

  private async run(
    input: ModerationActionInput & { type: PunishmentType; durationMs?: number },
  ): Promise<ModerationActionResult> {
    const punishment = await punishmentService.createPunishment({
      guildId: input.guild.id,
      userId: input.target.id,
      type: input.type,
      reason: input.reason,
      evidence: input.evidence,
      issuedBy: input.actor.id,
      durationMs: input.durationMs,
    });

    const result = await punishmentService.executeAction(punishment, {
      guild: input.guild,
      target: input.target,
      targetUser: input.target.user,
      executorId: input.actor.id,
    });

    if (!result.executed) {
      return {
        executed: false,
        failureReason: result.failureReason,
        punishment: result.punishment,
      };
    }

    const duration =
      input.durationMs === undefined ? undefined : durationService.format(input.durationMs);

    // Logged to PUNISHMENT_LOG and nowhere else. Timeouts and jails are not
    // announced — only staff warnings get posted where the member sees them.
    await punishmentLogService.record(result.punishment);

    return { executed: true, punishment: result.punishment, duration };
  }
}

export const moderationActionService = new ModerationActionService();
