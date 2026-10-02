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
import {
  GIFT_DELIVERY_STATUS_LABELS,
  GIFT_DELIVERY_TYPE_LABELS,
  giftDeliveryMessages,
} from "../../../data/gift-claim/delivery-messages.ts";
import type { GiftClaim } from "../models/gift-claim.model.ts";
import type { GiftDelivery } from "../models/gift-delivery.model.ts";
import {
  DECIDABLE_CLAIM_STATUSES,
  GiftClaimSource,
  GiftClaimStatus,
  GiftDeliveryStatus,
  GiftDeliveryType,
  RETRYABLE_DELIVERY_STATUSES,
} from "../types/enums.ts";
import { GiftClaimCustomId } from "../handlers/component-ids.ts";

const M = giftClaimMessages.case;
const C = giftClaimComponents;
const D = giftDeliveryMessages;

type CardDelivery = Pick<GiftDelivery, "status" | "error"> | null | undefined;

export function deliveryAction(
  claim: Pick<GiftClaim, "status" | "deliveryType">,
  delivery: CardDelivery,
): "DELIVER" | "RETRY" | null {
  if (claim.status !== GiftClaimStatus.APPROVED) return null;
  const open = !delivery || RETRYABLE_DELIVERY_STATUSES.includes(delivery.status);
  if (!open) return null;
  return claim.deliveryType === GiftDeliveryType.CREDITS ? "RETRY" : "DELIVER";
}

/**
 * Credits are delivered automatically by autoclaim, so they get no delivery button —
 * except "retry" after the automatic transfer failed (or never ran), the only way to
 * recover. Links and other gifts keep the button: a person has to hand those over.
 */
export function showDeliveryButton(
  claim: Pick<GiftClaim, "status" | "deliveryType">,
  delivery: CardDelivery,
): boolean {
  if (claim.deliveryType !== GiftDeliveryType.CREDITS) return true;
  return deliveryAction(claim, delivery) === "RETRY";
}

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
    | "deliveryType"
    | "amount"
  > &
    Partial<Pick<GiftClaim, "source" | "requestedBy">>,
  delivery?: CardDelivery,
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(
    giftClaimConfig.caseAccentColor[claim.status] ?? giftClaimConfig.caseAccentColor.PENDING,
  );

  const isRequest = claim.source === GiftClaimSource.REQUEST;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(isRequest ? M.staffRequestHeading : M.heading),
  );

  const info = [
    M.user(claim.userId),
    M.claimId(claim.claimId),
    ...(claim.requestedBy ? [M.requestedBy(claim.requestedBy)] : []),
    "",
    M.reward(claim.rewardName),
    ...(claim.prize ? [M.prize(claim.prize)] : []),
    "",
    M.statusLine(claim.status),
    ...(claim.reviewedBy ? [M.reviewedBy(claim.reviewedBy)] : []),
    ...(claim.fulfilledBy ? [M.fulfilledBy(claim.fulfilledBy)] : []),
    ...(claim.rejectionReason ? [M.rejectionReason(claim.rejectionReason)] : []),
    ...(claim.deliveryType
      ? [D.card.type(GIFT_DELIVERY_TYPE_LABELS[claim.deliveryType] ?? claim.deliveryType)]
      : []),
    ...(claim.amount ? [D.card.amount(claim.amount)] : []),
    ...(delivery
      ? [D.card.deliveryStatus(GIFT_DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status)]
      : []),
    ...(delivery?.status === GiftDeliveryStatus.FAILED && delivery.error
      ? [D.card.deliveryError(delivery.error)]
      : []),
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
  if (!isRequest || claim.proof.length > 0 || claim.fulfillmentProof) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(proofLines.join("\n")));
  }

  const decidable = (DECIDABLE_CLAIM_STATUSES as GiftClaimStatus[]).includes(claim.status);
  const action = deliveryAction(claim, delivery);
  const buttons = [
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
  ];
  if (showDeliveryButton(claim, delivery)) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(
          action === "RETRY"
            ? GiftClaimCustomId.retry(claim.claimId)
            : GiftClaimCustomId.deliver(claim.claimId),
        )
        .setLabel(action === "RETRY" ? D.buttons.retry : D.buttons.deliver)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(action === null),
    );
  }
  container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
