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
    components: [buildInfoRow(kase.caseId), buildStatusRow(kase.caseId, kase.status)],
    allowedMentions: { parse: [] },
  };
}

export function buildInfoRow(caseId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.info(caseId))
      .setLabel(T.infoButton)
      .setEmoji(emojis.locked)
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildStatusRow(
  caseId: string,
  status: ModmailCase["status"],
): ActionRowBuilder<ButtonBuilder> {
  const btn = (to: string, label: string, style: ButtonStyle, disabled: boolean) =>
    new ButtonBuilder()
      .setCustomId(CustomId.status(caseId, to))
      .setLabel(label)
      .setStyle(style)
      .setDisabled(disabled);

  const closed = status === ModmailCaseStatus.CLOSED;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    btn(ModmailCaseStatus.INVESTIGATING, T.statusButtons.investigating, ButtonStyle.Primary, closed),
    btn(ModmailCaseStatus.WAITING_USER, T.statusButtons.waitingUser, ButtonStyle.Secondary, closed),
    btn(ModmailCaseStatus.RESOLVED, T.statusButtons.resolve, ButtonStyle.Success, closed),
    btn(ModmailCaseStatus.CLOSED, T.statusButtons.close, ButtonStyle.Danger, closed),
  );
}

export function renderReporterMessageForThread(content: string): string {
  return T.reporterRelay(content);
}

export function renderSystemNote(text: string): string {
  return T.systemNote(text);
}
