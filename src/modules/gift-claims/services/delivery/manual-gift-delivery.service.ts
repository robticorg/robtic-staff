import { ConflictError } from "../../../../shared/utils/errors.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import type { GiftDeliveryDocument } from "../../models/gift-delivery.model.ts";
import { assertDeliveryNotBusy } from "./credit-delivery.service.ts";
import { cleanAdditionalInfo } from "./gift-delivery-input.ts";
import {
  giftDeliveryProofService,
  type StoredProofFile,
  type UploadedProof,
} from "./gift-delivery-proof.service.ts";
import { giftDeliveriesChannel } from "./gift-deliveries-channel.ts";
import { giftDeliveryRepository } from "./gift-delivery.repository.ts";

const log = logger.child("gift-delivery:manual");
const M = giftDeliveryMessages;

export class ManualGiftDeliveryService {
  async deliver(
    delivery: GiftDeliveryDocument,
    staffId: string,
    uploads: readonly UploadedProof[],
    rawInfo: string | null,
  ): Promise<{ delivery: GiftDeliveryDocument; files: StoredProofFile[] }> {
    giftDeliveryProofService.assertValid(uploads);
    await giftDeliveriesChannel.resolve(delivery.guildId);
    const files = await giftDeliveryProofService.fetch(uploads);

    const locked = await giftDeliveryRepository.lockForProcessing(delivery.deliveryId);
    if (!locked) {
      const fresh = await giftDeliveryRepository.findById(delivery.deliveryId);
      assertDeliveryNotBusy(fresh ?? delivery);
      throw new ConflictError(M.errors.inProgress);
    }

    const info = cleanAdditionalInfo(rawInfo);
    try {
      await giftDeliveryProofService.attach(locked, staffId, files);
    } catch (err) {
      await giftDeliveryRepository.markFailed(locked.deliveryId, "PROOF_SAVE_FAILED");
      throw err;
    }

    const auditMessageId = await giftDeliveriesChannel.post(locked.guildId, {
      content: [
        M.log.otherDelivered(locked.userId, staffId, locked.claimId),
        ...(info ? [M.log.info(info)] : []),
      ].join("\n"),
      files: giftDeliveryProofService.attachments(files),
    });

    const fulfilled = await giftDeliveryRepository.markFulfilled(locked.deliveryId, {
      deliveredBy: staffId,
      ...(info ? { additionalInfo: info } : {}),
      ...(auditMessageId ? { auditMessageId } : {}),
    });
    log.info(`manual delivery ${locked.deliveryId} fulfilled by ${staffId}`);
    return { delivery: fulfilled ?? locked, files };
  }
}

export const manualGiftDeliveryService = new ManualGiftDeliveryService();
