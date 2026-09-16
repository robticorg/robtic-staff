import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { emojis } from "../../../data/emojis/index.ts";
import type { ModmailCase } from "../models/modmail-case.model.ts";
import { ModmailCaseStatus, ModmailCaseType } from "../types/enums.ts";
import { CustomId } from "../handlers/component-ids.ts";

const T = modmailMessages.thread;

export const REPORTER_LABEL = T.reporterLabel;

export function buildThreadOpener(
  kase: Pick<
    ModmailCase,
    "caseId" | "type" | "reportedUserId" | "reason" | "description" | "evidenceCount" | "status"
  >,
): BaseMessageOptions {
  const isStaffReport = kase.type === ModmailCaseType.STAFF_REPORT;
  const lines = [
    T.openerHeading(kase.caseId, isStaffReport),
    "",
    T.reportedLine(kase.reportedUserId),
    T.reporterLine,
    "",
    T.reasonHeading,
    kase.reason || T.notProvided,
    "",
    T.descriptionHeading,
    kase.description || T.notProvided,
    "",
    T.evidenceLine(kase.evidenceCount),
    "",
    T.replyHint,
  ];
  return {
    content: lines.join("\n"),
    components: [buildActionRow(kase.caseId, kase.status)],
    allowedMentions: { parse: [] },
  };
}

export function buildActionRow(
  caseId: string,
  status: ModmailCase["status"],
): ActionRowBuilder<ButtonBuilder> {
  const closed = status === ModmailCaseStatus.CLOSED;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.info(caseId))
      .setLabel(T.infoButton)
      .setEmoji(emojis.locked)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CustomId.status(caseId, ModmailCaseStatus.CLOSED))
      .setLabel(T.statusButtons.close)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(closed),
  );
}

export function renderReporterMessageForThread(content: string): string {
  return T.reporterRelay(content);
}

export function renderSystemNote(text: string): string {
  return T.systemNote(text);
}
