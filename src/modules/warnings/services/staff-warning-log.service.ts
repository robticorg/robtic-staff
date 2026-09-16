import type { Guild } from "discord.js";
import type { IdLike, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffWarningModel } from "../models/staff-warning.model.ts";
import {
  StaffWarningRealSource,
  StaffWarningType,
} from "../types/enums.ts";
import {
  formatStaffWarningMessage,
  staffWarnMessageWasTruncated,
} from "../render/staff-warn-message.ts";

const log = logger.child("staff-warn-log");

export interface SendStaffWarningLogInput {
  guild: Guild;
  warningId: IdLike;
  /** Saves a lookup when the caller already knows the warned member. */
  targetId?: UserId;
}

export type StaffWarningLogOutcome =
  | "sent"
  | "not-configured"
  | "channel-unavailable"
  | "not-real"
  | "not-found"
  | "send-failed";

export interface StaffWarningLogResult {
  outcome: StaffWarningLogOutcome;
  messageId?: string;
}

/**
 * Posts the Staff Warn message for a REAL staff warning (§1–§8).
 *
 * This is a reporting side-effect only: it never throws, never mutates warning
 * state beyond stamping the message id, and a Discord failure must never undo
 * a warning that is already persisted (§15).
 */
export class StaffWarningLogService {
  async send(input: SendStaffWarningLogInput): Promise<StaffWarningLogResult> {
    try {
      const warning = await StaffWarningModel.findById(toObjectId(input.warningId)).exec();
      if (!warning) {
        log.warn(`staff warn log skipped — warning ${String(input.warningId)} not found`);
        return { outcome: "not-found" };
      }

      // §3 / §9 — verbal warnings are DB-only and never produce this message.
      if ((warning.type ?? StaffWarningType.REAL) !== StaffWarningType.REAL) {
        return { outcome: "not-real" };
      }

      const channelId = await channelConfigService.getChannelId(
        input.guild.id,
        ChannelConfigType.STAFF_WARNS,
      );
      if (!channelId) {
        // §1 — configuration gap must not interrupt the warning workflow.
        log.warn(
          `STAFF_WARNS channel is not configured for guild ${input.guild.id} — ` +
            `staff warn ${warning._id.toString()} was stored but not announced`,
        );
        return { outcome: "not-configured" };
      }

      const targetId = input.targetId ?? (await this.resolveTargetId(warning.staffId));
      if (!targetId) {
        log.warn(`staff warn log skipped — could not resolve the staff member's user id`);
        return { outcome: "not-found" };
      }

      const { reason, evidence } = await this.resolveReasonAndEvidence(warning);

      const content = formatStaffWarningMessage({
        level: warning.level ?? 1,
        targetId,
        reason,
        evidence,
      });
      if (staffWarnMessageWasTruncated(content)) {
        log.warn(`staff warn ${warning._id.toString()} proof list trimmed to fit Discord's limit`);
      }

      const channel = await input.guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        log.warn(`STAFF_WARNS channel ${channelId} in ${input.guild.id} is missing or not text`);
        return { outcome: "channel-unavailable" };
      }

      // §4 — the warned member must actually be pinged, but a reason containing
      // @everyone/@here or a stray role mention must not broadcast.
      const message = await channel.send({
        content,
        allowedMentions: { users: [targetId] },
      });

      // §11 — kept for later linking/editing; failure here is not fatal.
      await StaffWarningModel.updateOne(
        { _id: warning._id },
        { $set: { staffWarnMessageId: message.id } },
      )
        .exec()
        .catch((err) => log.warn("storing staffWarnMessageId failed", err));

      log.info(
        `staff warn ${warning.level ?? "?"} announced for ${targetId} in ${input.guild.id}`,
      );
      return { outcome: "sent", messageId: message.id };
    } catch (err) {
      // §15 — the warning stays stored; logging failure is contained here.
      log.error("staff warn log post failed", err);
      return { outcome: "send-failed" };
    }
  }

  private async resolveTargetId(staffObjectId: unknown): Promise<UserId | null> {
    const staff = await StaffModel.findById(staffObjectId as never)
      .select({ userId: 1 })
      .exec();
    return staff?.userId ?? null;
  }

  /**
   * Real warnings in this system are produced by escalating three verbal
   * warnings, so the warning row itself carries a generated reason and no
   * evidence — the manager's actual wording and attachments live on the source
   * verbal warnings. Gathering them here keeps the log truthful without
   * touching the warning logic itself.
   */
  private async resolveReasonAndEvidence(
    warning: { reason: string; evidence?: string[]; source?: string; sourceVerbalWarningIds?: unknown[] },
  ): Promise<{ reason: string; evidence: string[] }> {
    const ownEvidence = warning.evidence ?? [];

    const sourceIds = warning.sourceVerbalWarningIds ?? [];
    if (warning.source !== StaffWarningRealSource.VERBAL_ESCALATION || sourceIds.length === 0) {
      return { reason: warning.reason, evidence: [...ownEvidence] };
    }

    const verbals = await StaffWarningModel.find({ _id: { $in: sourceIds as never[] } })
      .sort({ createdAt: 1 })
      .select({ reason: 1, evidence: 1 })
      .exec();

    const reasons = verbals.map((v) => v.reason.trim()).filter((r) => r.length > 0);
    const evidence = [...ownEvidence];
    for (const v of verbals) {
      for (const url of v.evidence ?? []) if (!evidence.includes(url)) evidence.push(url);
    }

    return {
      reason: reasons.length > 0 ? reasons.join(" | ") : warning.reason,
      evidence,
    };
  }
}

export const staffWarningLogService = new StaffWarningLogService();
