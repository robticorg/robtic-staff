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
import { punishmentConfig } from "../../../data/config/punishment.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import type { Punishment } from "../models/punishment.model.ts";
import type { PunishmentApproval } from "../models/punishment-approval.model.ts";
import { PunishmentApprovalStatus } from "../types/enums.ts";
import { PunCustomId } from "../handlers/component-ids.ts";

const A = punishmentMessages.approval;

export interface ApprovalCardOptions {
  disabled?: boolean;
  statusOverride?: string;
}

export function buildApprovalCard(
  punishment: Pick<Punishment, "userId" | "type" | "reason" | "reportId" | "evidence">,
  approval: Pick<PunishmentApproval, "approvalId" | "requestedBy" | "status" | "decidedBy">,
  opts: ApprovalCardOptions = {},
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colorFor(approval.status));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(A.cardHeading(punishment.type)),
  );
  const lines = [
    A.target(punishment.userId),
    A.requestedBy(approval.requestedBy),
    A.reason(punishment.reason),
    ...(punishment.reportId ? [A.report(punishment.reportId)] : []),
    punishment.evidence.length ? A.evidence(punishment.evidence.length) : A.noEvidence,
  ];
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(opts.statusOverride ?? statusLine(approval)),
  );

  const decided = approval.status !== PunishmentApprovalStatus.PENDING || opts.disabled;
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(PunCustomId.approve(approval.approvalId))
        .setLabel(A.approveButton)
        .setStyle(ButtonStyle.Success)
        .setDisabled(!!decided),
      new ButtonBuilder()
        .setCustomId(PunCustomId.reject(approval.approvalId))
        .setLabel(A.rejectButton)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!!decided),
      new ButtonBuilder()
        .setCustomId(PunCustomId.info(approval.approvalId))
        .setLabel(A.infoButton)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}

function statusLine(
  approval: Pick<PunishmentApproval, "status" | "decidedBy">,
): string {
  switch (approval.status) {
    case PunishmentApprovalStatus.APPROVED:
      return A.statusApproved(approval.decidedBy ?? "?");
    case PunishmentApprovalStatus.REJECTED:
      return A.statusRejected(approval.decidedBy ?? "?");
    case PunishmentApprovalStatus.EXPIRED:
      return A.statusExpired;
    default:
      return A.statusPending;
  }
}

function colorFor(status: PunishmentApprovalStatus): number {
  const c = punishmentConfig.approvalColors;
  if (status === PunishmentApprovalStatus.APPROVED) return c.approved;
  if (status === PunishmentApprovalStatus.REJECTED) return c.rejected;
  if (status === PunishmentApprovalStatus.EXPIRED) return c.expired;
  return c.pending;
}
