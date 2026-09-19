import type { Guild, GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { ModerationLogKind } from "../../warnings/render/moderation-log-message.ts";
import { staffWarningLogService } from "../../warnings/services/staff-warning-log.service.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { PunishmentType } from "../types/enums.ts";
import { durationService } from "./duration.service.ts";
import { punishmentLogService } from "./punishment-log.service.ts";
import { punishmentService } from "./punishment.service.ts";

export interface ModerationActionInput {
  guild: Guild;
  target: GuildMember;
  actorId: UserId;
  reason: string;
  evidence: string[];
}

export interface TimeoutActionInput extends ModerationActionInput {
  durationMs: number;
}

export interface ModerationActionResult {
  executed: boolean;
  failureReason?: string;
  punishment: HydratedDocument<Punishment>;

  /** Formatted for display — timeout only. */
  duration?: string;
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
    return this.run({
      ...input,
      type: PunishmentType.TIMEOUT,
      kind: ModerationLogKind.TIMEOUT,
      durationMs: input.durationMs,
    });
  }

  jail(input: ModerationActionInput): Promise<ModerationActionResult> {
    return this.run({ ...input, type: PunishmentType.JAIL, kind: ModerationLogKind.JAIL });
  }

  private async run(
    input: ModerationActionInput & {
      type: PunishmentType;
      kind: ModerationLogKind;
      durationMs?: number;
    },
  ): Promise<ModerationActionResult> {
    const punishment = await punishmentService.createPunishment({
      guildId: input.guild.id,
      userId: input.target.id,
      type: input.type,
      reason: input.reason,
      evidence: input.evidence,
      issuedBy: input.actorId,
      durationMs: input.durationMs,
    });

    const result = await punishmentService.executeAction(punishment, {
      guild: input.guild,
      target: input.target,
      targetUser: input.target.user,
      executorId: input.actorId,
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

    await punishmentLogService.record(result.punishment);
    await staffWarningLogService.sendModerationAction({
      guild: input.guild,
      kind: input.kind,
      targetId: input.target.id,
      reason: input.reason,
      evidence: input.evidence,
      moderatorId: input.actorId,
      duration,
    });

    return { executed: true, punishment: result.punishment, duration };
  }
}

export const moderationActionService = new ModerationActionService();
