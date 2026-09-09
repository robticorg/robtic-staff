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
import { giftClaimComponents } from "../../../data/gift-claim/components.ts";
import { giftClaimConfig } from "../../../data/gift-claim/config.ts";
import { giftClaimMessages } from "../../../data/gift-claim/messages.ts";
import type { GiftClaim } from "../models/gift-claim.model.ts";
import { GiftClaimStatus, DECIDABLE_CLAIM_STATUSES } from "../types/enums.ts";
import { GiftClaimCustomId } from "../handlers/component-ids.ts";

const M = giftClaimMessages.case;
const C = giftClaimComponents;

export function buildGiftClaimCaseCard(
  claim: Pick<
    GiftClaim,
    | "claimId"
    | "userId"
    | "rewardName"
    | "prize"
    | "status"
    | "proof"
    | "fulfillmentProof"
    | "reviewedBy"
    | "fulfilledBy"
    | "rejectionReason"
  >,
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(
    giftClaimConfig.caseAccentColor[claim.status] ?? giftClaimConfig.caseAccentColor.PENDING,
  );

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(M.heading));

  const info = [
    M.user(claim.userId),
    M.claimId(claim.claimId),
    "",
    M.reward(claim.rewardName),
    ...(claim.prize ? [M.prize(claim.prize)] : []),
    "",
    M.statusLine(claim.status),
    ...(claim.reviewedBy ? [M.reviewedBy(claim.reviewedBy)] : []),
    ...(claim.fulfilledBy ? [M.fulfilledBy(claim.fulfilledBy)] : []),
    ...(claim.rejectionReason ? [M.rejectionReason(claim.rejectionReason)] : []),
  ];
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(info.join("\n")));

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  const proofLines = [
    M.proofHeading,
    ...(claim.proof.length ? claim.proof.map((p, i) => `${i + 1}. ${p.url}`) : [M.noProofYet]),
  ];
  if (claim.fulfillmentProof) {
    proofLines.push("", M.fulfillmentProofHeading, claim.fulfillmentProof);
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(proofLines.join("\n")));

  const decidable = (DECIDABLE_CLAIM_STATUSES as GiftClaimStatus[]).includes(claim.status);
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(GiftClaimCustomId.approve(claim.claimId))
        .setLabel(C.approveButton)
        .setStyle(ButtonStyle.Success)
        .setDisabled(!decidable),
      new ButtonBuilder()
        .setCustomId(GiftClaimCustomId.reject(claim.claimId))
        .setLabel(C.rejectButton)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!decidable),
      new ButtonBuilder()
        .setCustomId(GiftClaimCustomId.done(claim.claimId))
        .setLabel(C.doneButton)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(claim.status !== GiftClaimStatus.APPROVED),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
