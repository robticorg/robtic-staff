import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { limits } from "../../../data/config/limits.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import type { ModmailCase } from "../models/modmail-case.model.ts";
import { ModmailCaseStatus, ModmailCaseType } from "../types/enums.ts";
import { CustomId } from "../handlers/component-ids.ts";

const C = modmailMessages.card;

export interface ReportMessageOptions {
  evidenceCount: number;
  claimed?: boolean;
  handlerMention?: string;
  closed?: boolean;
}

function accentFor(opts: ReportMessageOptions): number {
  if (opts.closed) return colors.neutral;
  return opts.claimed ? colors.success : colors.warning;
}

export function buildReportMessage(
  kase: Pick<ModmailCase, "caseId" | "type" | "reportedUserId" | "reason" | "status">,
  opts: ReportMessageOptions,
): BaseMessageOptions {
  const isStaffReport = kase.type === ModmailCaseType.STAFF_REPORT;
  const closed = opts.closed ?? kase.status === ModmailCaseStatus.CLOSED;

  const container = new ContainerBuilder().setAccentColor(accentFor({ ...opts, closed }));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${isStaffReport ? C.headingStaff : C.headingNew}`,
    ),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(C.caseLine(kase.caseId)),
  );
  if (!isStaffReport) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(C.typeUserReport));
  }

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${isStaffReport ? C.reportedStaffLabel : C.reportedLabel}**\n<@${kase.reportedUserId}>`,
    ),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**${C.reporterLabel}** ${C.reporterPrivate}`),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${C.reasonLabel}**\n${
        kase.reason ? truncate(kase.reason, limits.reasonMaxLength) : C.reasonFallback
      }`,
    ),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${C.evidenceLabel}** ${C.evidenceCount(opts.evidenceCount)}`,
    ),
  );

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${C.statusLabel}** ${
        closed ? C.closedLabel : opts.claimed ? C.statusClaimed(opts.handlerMention) : kase.status
      }`,
    ),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${C.handlerLabel}** ${opts.handlerMention ?? C.handlerNone}`,
    ),
  );

  if (!closed) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CustomId.claim(kase.caseId))
        .setLabel(opts.claimed ? C.claimedButton : C.claimButton)
        .setStyle(opts.claimed ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(!!opts.claimed),
    );
    if (opts.claimed) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(CustomId.transfer(kase.caseId))
          .setLabel(C.transferButton)
          .setStyle(ButtonStyle.Primary),
      );
    }
    container.addActionRowComponents(row);
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
