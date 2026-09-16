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
  formatVerbalStaffWarningMessage,
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
  | "not-verbal"
  | "not-found"
  | "send-failed";

export interface StaffWarningLogResult {
  outcome: StaffWarningLogOutcome;
  messageId?: string;
}

/**
 * Posts the plain four-line Staff Warn announcement into STAFF_WARN_ANNOUNCE
 * — `send()` for a REAL warning (§1–§8), `sendVerbal()` for a VERBAL one.
 * Never STAFF_WARNS (where warnings are issued) and never WARNING_LOG (which
 * keeps its own embed audit trail).
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
        ChannelConfigType.STAFF_WARN_ANNOUNCE,
      );
      if (!channelId) {
        // §1 — configuration gap must not interrupt the warning workflow.
        // Deliberately no fallback to STAFF_WARNS: that is the channel managers
        // issue warnings in, and announcing into it is exactly what this slot
        // exists to avoid.
        log.warn(
          `STAFF_WARN_ANNOUNCE channel is not configured for guild ${input.guild.id} — ` +
            `staff warn ${warning._id.toString()} was stored but not announced`,
        );
        return { outcome: "not-configured" };
      }

      const targetId = input.targetId ?? (await this.resolveTargetId(warning.staffId));
      if (!targetId) {
        log.warn(`staff warn log skipped — could not resolve the staff member's user id`);
        return { outcome: "not-found" };
      }

      const evidence = await this.resolveEvidence(warning);

      const content = formatStaffWarningMessage({
        level: warning.level ?? 1,
        targetId,
        reason: warning.reason,
        evidence,
      });
      if (staffWarnMessageWasTruncated(content)) {
        log.warn(`staff warn ${warning._id.toString()} proof list trimmed to fit Discord's limit`);
      }

      const channel = await input.guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        log.warn(
          `STAFF_WARN_ANNOUNCE channel ${channelId} in ${input.guild.id} is missing or not text`,
        );
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

  /**
   * Posts the plain four-line "Staff Warn شفوي" message for a VERBAL staff
   * warning into the STAFF_WARNS channel where it was issued.
   *
   * Same reporting-side-effect guarantees as `send()`: never throws, never
   * mutates warning state beyond stamping the message id.
   */
  async sendVerbal(input: SendStaffWarningLogInput): Promise<StaffWarningLogResult> {
    try {
      const warning = await StaffWarningModel.findById(toObjectId(input.warningId)).exec();
      if (!warning) {
        log.warn(`staff warn log skipped — warning ${String(input.warningId)} not found`);
        return { outcome: "not-found" };
      }

      if ((warning.type ?? StaffWarningType.REAL) !== StaffWarningType.VERBAL) {
        return { outcome: "not-verbal" };
      }

      const channelId = await channelConfigService.getChannelId(
        input.guild.id,
        ChannelConfigType.STAFF_WARN_ANNOUNCE,
      );
      if (!channelId) {
        log.warn(
          `STAFF_WARN_ANNOUNCE channel is not configured for guild ${input.guild.id} — ` +
            `verbal staff warn ${warning._id.toString()} was stored but not announced`,
        );
        return { outcome: "not-configured" };
      }

      const targetId = input.targetId ?? (await this.resolveTargetId(warning.staffId));
      if (!targetId) {
        log.warn(`staff warn log skipped — could not resolve the staff member's user id`);
        return { outcome: "not-found" };
      }

      const content = formatVerbalStaffWarningMessage({
        targetId,
        reason: warning.reason,
        evidence: warning.evidence ?? [],
      });
      if (staffWarnMessageWasTruncated(content)) {
        log.warn(`staff warn ${warning._id.toString()} proof list trimmed to fit Discord's limit`);
      }

      const channel = await input.guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        log.warn(
          `STAFF_WARN_ANNOUNCE channel ${channelId} in ${input.guild.id} is missing or not text`,
        );
        return { outcome: "channel-unavailable" };
      }

      const message = await channel.send({
        content,
        allowedMentions: { users: [targetId] },
      });

      await StaffWarningModel.updateOne(
        { _id: warning._id },
        { $set: { staffWarnMessageId: message.id } },
      )
        .exec()
        .catch((err) => log.warn("storing staffWarnMessageId failed", err));

      log.info(`verbal staff warn announced for ${targetId} in ${input.guild.id}`);
      return { outcome: "sent", messageId: message.id };
    } catch (err) {
      log.error("verbal staff warn log post failed", err);
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
   * A real warning produced by escalating three verbal warnings carries its
   * own generic reason ("حصل على 3 تحذيرات شفوية") — never the verbal
   * managers' individual wording. Their attached proof is still worth
   * surfacing, so it is merged in here without touching the reason.
   */
  private async resolveEvidence(warning: {
    evidence?: string[];
    source?: string;
    sourceVerbalWarningIds?: unknown[];
  }): Promise<string[]> {
    const evidence = [...(warning.evidence ?? [])];

    const sourceIds = warning.sourceVerbalWarningIds ?? [];
    if (warning.source !== StaffWarningRealSource.VERBAL_ESCALATION || sourceIds.length === 0) {
      return evidence;
    }

    const verbals = await StaffWarningModel.find({ _id: { $in: sourceIds as never[] } })
      .sort({ createdAt: 1 })
      .select({ evidence: 1 })
      .exec();

    for (const v of verbals) {
      for (const url of v.evidence ?? []) if (!evidence.includes(url)) evidence.push(url);
    }

    return evidence;
  }
}

export const staffWarningLogService = new StaffWarningLogService();
