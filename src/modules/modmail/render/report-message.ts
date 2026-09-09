import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { limits } from "../../../data/config/limits.ts";
import type { ModmailCase } from "../models/modmail-case.model.ts";
import { ModmailCaseType } from "../types/enums.ts";
import { CustomId } from "../handlers/component-ids.ts";

const C = modmailMessages.card;

export function buildReportMessage(
  kase: Pick<ModmailCase, "caseId" | "type" | "reportedUserId" | "reason" | "status">,
  opts: { evidenceCount: number; claimed?: boolean; handlerMention?: string },
): BaseMessageOptions {
  const isStaffReport = kase.type === ModmailCaseType.STAFF_REPORT;
  const heading = isStaffReport ? C.headingStaff : C.headingNew;
  const reportedLabel = isStaffReport ? C.reportedStaffLabel : C.reportedLabel;

  const lines = [
    `**${heading}**`,
    C.rule(limits.reportRuleWidth),
    "",
    C.caseLine(kase.caseId),
    ...(isStaffReport ? [] : ["", C.typeUserReport]),
    "",
    reportedLabel,
    `<@${kase.reportedUserId}>`,
    "",
    C.reporterLabel,
    C.reporterPrivate,
    "",
    C.reasonLabel,
    kase.reason ? truncate(kase.reason, limits.reasonMaxLength) : C.reasonFallback,
    "",
    C.evidenceLabel,
    C.evidenceCount(opts.evidenceCount),
    "",
    C.statusLabel,
    opts.claimed ? C.statusClaimed(opts.handlerMention) : kase.status,
  ];

  const claim = new ButtonBuilder()
    .setCustomId(CustomId.claim(kase.caseId))
    .setLabel(opts.claimed ? C.claimedButton : C.claimButton)
    .setStyle(opts.claimed ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(!!opts.claimed);

  return {
    content: lines.join("\n"),
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(claim)],
    allowedMentions: { parse: [] },
  };
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
