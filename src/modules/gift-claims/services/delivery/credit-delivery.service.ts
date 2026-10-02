import { ConflictError } from "../../../../shared/utils/errors.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import type { GiftDeliveryDocument } from "../../models/gift-delivery.model.ts";
import { GiftDeliveryStatus } from "../../types/enums.ts";
import { staffConfigService } from "../../../configuration/services/staff-config.service.ts";
import { GiftClaimError } from "../gift-claim.service.ts";
import {
  TransferFailure,
  startAutoclaimTransfer,
  type StartTransfer,
} from "./autoclaim.client.ts";
import { giftDeliveriesChannel } from "./gift-deliveries-channel.ts";
import { giftDeliveryProofService, type StoredProofFile } from "./gift-delivery-proof.service.ts";
import { giftDeliveryRepository } from "./gift-delivery.repository.ts";

const log = logger.child("gift-delivery:credits");
const M = giftDeliveryMessages;

const FAILURE_LABELS: Record<TransferFailure, string> = {
  [TransferFailure.DISABLED]: M.errors.creditsDisabled,
  [TransferFailure.UNAVAILABLE]: M.errors.apiUnavailable,
  [TransferFailure.REJECTED]: M.errors.apiRejected,
  [TransferFailure.TIMEOUT]: M.errors.apiTimeout,
};

export type CreditDeliveryResult =
  | { ok: true; delivery: GiftDeliveryDocument }
  | { ok: false; reason: TransferFailure; label: string };

export function assertDeliveryNotBusy(delivery: Pick<GiftDeliveryDocument, "status">): void {
  if (delivery.status === GiftDeliveryStatus.PROCESSING) {
    throw new ConflictError(M.errors.inProgress);
  }
  if (
    delivery.status === GiftDeliveryStatus.FULFILLED ||
    delivery.status === GiftDeliveryStatus.READY ||
    delivery.status === GiftDeliveryStatus.CLAIMED
  ) {
    throw new ConflictError(M.errors.alreadyDelivered);
  }
}

export async function assertAutoclaimEnabled(guildId: string): Promise<void> {
  if (!(await staffConfigService.isAutoclaimEnabled(guildId))) {
    throw new GiftClaimError("GIFT_AUTOCLAIM_OFF", M.errors.autoclaimOff);
  }
}

export class CreditDeliveryService {
  constructor(private transfer: StartTransfer = startAutoclaimTransfer) {}

  useTransfer(transfer: StartTransfer): void {
    this.transfer = transfer;
  }

  async deliver(
    delivery: GiftDeliveryDocument,
    staffId: string,
    proof: readonly StoredProofFile[] = [],
    replyChannelId: string | null = null,
  ): Promise<CreditDeliveryResult> {
    if (!delivery.amount) {
      throw new GiftClaimError("GIFT_AMOUNT_MISSING", M.errors.amountInvalid);
    }
    await assertAutoclaimEnabled(delivery.guildId);
    const channel = await giftDeliveriesChannel.resolve(delivery.guildId);

    const locked = await giftDeliveryRepository.lockForProcessing(delivery.deliveryId);
    if (!locked) {
      const fresh = await giftDeliveryRepository.findById(delivery.deliveryId);
      assertDeliveryNotBusy(fresh ?? delivery);
      throw new ConflictError(M.errors.inProgress);
    }

    try {
      await giftDeliveryProofService.attach(locked, staffId, proof);
    } catch (err) {
      await giftDeliveryRepository.markFailed(locked.deliveryId, "PROOF_SAVE_FAILED");
      throw err;
    }

    let outcome;
    try {
      outcome = await this.transfer(
        {
          userId: locked.userId,
          guildId: locked.guildId,
          channelId: channel.id,
          amount: locked.amount!,
          sendMessage: async (content) => ({
            id: (await giftDeliveriesChannel.reply(replyChannelId, content)) ?? "",
          }),
        },
        {
          idempotencyKey: `gift-${locked.deliveryId}`,
          announcement: M.log.creditsStarting(locked.userId, locked.amount!, locked.claimId),
        },
      );
    } catch (err) {
      log.error(`credit transfer for ${locked.deliveryId} crashed`, err);
      outcome = { ok: false as const, reason: TransferFailure.UNAVAILABLE };
    }

    if (!outcome.ok) {
      await giftDeliveryRepository.markFailed(locked.deliveryId, outcome.reason);
      await giftDeliveriesChannel.reply(
        replyChannelId,
        M.log.creditsFailed(locked.userId, locked.claimId, FAILURE_LABELS[outcome.reason]),
      );
      await giftDeliveriesChannel.post(locked.guildId, {
        content: M.log.creditsFailed(locked.userId, locked.claimId, FAILURE_LABELS[outcome.reason]),
        tone: "error",
      });
      log.warn(`credit delivery ${locked.deliveryId} failed: ${outcome.reason}`);
      return { ok: false, reason: outcome.reason, label: FAILURE_LABELS[outcome.reason] };
    }

    const fulfilled = await giftDeliveryRepository.markFulfilled(locked.deliveryId, {
      deliveredBy: staffId,
      ...(outcome.messageId ? { auditMessageId: outcome.messageId } : {}),
    });
    await giftDeliveriesChannel.reply(replyChannelId, M.log.creditsDone(locked.userId, locked.amount!, locked.claimId));
    await giftDeliveriesChannel.post(locked.guildId, {
      content: M.log.creditsDone(locked.userId, locked.amount!, locked.claimId),
      files: giftDeliveryProofService.attachments(proof),
      tone: "success",
    });
    log.info(`credit delivery ${locked.deliveryId} fulfilled (${locked.amount}) by ${staffId}`);
    return { ok: true, delivery: fulfilled ?? locked };
  }
}

export const creditDeliveryService = new CreditDeliveryService();
