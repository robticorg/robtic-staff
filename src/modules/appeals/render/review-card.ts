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
import { appealConfig } from "../../../data/appeals/config.ts";
import { appealMessages } from "../../../data/appeals/messages.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import type { Appeal } from "../models/appeal.model.ts";
import type { Punishment } from "../../punishment/models/punishment.model.ts";
import { AppealStatus } from "../types/enums.ts";
import { AplCustomId } from "../handlers/component-ids.ts";

const R = appealMessages.review;

function typeLabel(type: string): string {
  return punishmentMessages.labels[type] ?? type;
}

function statusBlock(appeal: Pick<Appeal, "status" | "claimedBy" | "reviewedBy" | "decisionReason">): string {
  switch (appeal.status) {
    case AppealStatus.CLAIMED:
    case AppealStatus.UNDER_REVIEW:
      return R.statusClaimed(appeal.claimedBy ?? "?");
    case AppealStatus.ACCEPTED:
      return R.statusAccepted(appeal.reviewedBy ?? "?", appeal.decisionReason ?? "—");
    case AppealStatus.REJECTED:
      return R.statusRejected(appeal.reviewedBy ?? "?", appeal.decisionReason ?? "—");
    default:
      return R.statusPending;
  }
}

export function buildAppealReviewCard(
  appeal: Pick<
    Appeal,
    "appealId" | "userId" | "reason" | "evidence" | "status" | "claimedBy" | "reviewedBy" | "decisionReason"
  >,
  punishment: Pick<Punishment, "type" | "punishmentId">,
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(
    appealConfig.reviewAccentColor[appeal.status] ?? appealConfig.reviewAccentColor.PENDING,
  );

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(R.heading));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        R.user(appeal.userId),
        R.punishment(typeLabel(punishment.type)),
        R.punishmentId(punishment.punishmentId),
        "",
        R.reason(appeal.reason),
        "",
        R.evidence(appeal.evidence),
      ].join("\n"),
    ),
  );
  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusBlock(appeal)));

  const decided =
    appeal.status === AppealStatus.ACCEPTED ||
    appeal.status === AppealStatus.REJECTED ||
    appeal.status === AppealStatus.CANCELLED;

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(AplCustomId.claim(appeal.appealId))
        .setLabel(R.claimButton)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(appeal.status !== AppealStatus.PENDING),
      new ButtonBuilder()
        .setCustomId(AplCustomId.accept(appeal.appealId))
        .setLabel(R.acceptButton)
        .setStyle(ButtonStyle.Success)
        .setDisabled(decided),
      new ButtonBuilder()
        .setCustomId(AplCustomId.reject(appeal.appealId))
        .setLabel(R.rejectButton)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(decided),
      new ButtonBuilder()
        .setCustomId(AplCustomId.info(appeal.appealId))
        .setLabel(R.infoButton)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
