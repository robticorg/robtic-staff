import { ConflictError } from "../../../../shared/utils/errors.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { giftDeliveryRuntimeConfig } from "../../../../config/gift-delivery.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import type { GiftDeliveryDocument } from "../../models/gift-delivery.model.ts";
import { GiftDeliveryStatus, LinkDeliveryPath } from "../../types/enums.ts";
import { GiftClaimError } from "../gift-claim.service.ts";
import { assertDeliveryNotBusy } from "./credit-delivery.service.ts";
import { cleanAdditionalInfo, parseGiftLink } from "./gift-delivery-input.ts";
import { giftDeliveriesChannel } from "./gift-deliveries-channel.ts";
import { giftDeliveryRepository, type DeliveryLocation } from "./gift-delivery.repository.ts";
import { decryptGiftSecret, encryptGiftSecret } from "./gift-secret.ts";
import { linkDeliveryMessageService } from "./link-delivery-message.service.ts";

const log = logger.child("gift-delivery:link");
const M = giftDeliveryMessages;

export interface LinkDeliveryResult {
  delivery: GiftDeliveryDocument;
  location: DeliveryLocation;
}

export interface RevealedGift {
  link: string;
  info: string | null;
  delivery: GiftDeliveryDocument;
}

function secretKey(): string {
  const key = giftDeliveryRuntimeConfig.giftLinkSecret;
  if (!key) throw new GiftClaimError("GIFT_SECRET_KEY_MISSING", M.errors.secretKeyMissing);
  return key;
}

export class LinkDeliveryService {
  async deliver(
    delivery: GiftDeliveryDocument,
    staffId: string,
    rawLink: string,
    rawInfo: string | null,
  ): Promise<LinkDeliveryResult> {
    const link = parseGiftLink(rawLink);
    if (!link) throw new GiftClaimError("GIFT_LINK_INVALID", M.errors.linkInvalid);
    const key = secretKey();

    const locked = await giftDeliveryRepository.lockForProcessing(delivery.deliveryId);
    if (!locked) {
      const fresh = await giftDeliveryRepository.findById(delivery.deliveryId);
      assertDeliveryNotBusy(fresh ?? delivery);
      throw new ConflictError(M.errors.inProgress);
    }

    await giftDeliveryRepository.storeSecret(locked.deliveryId, {
      secret: encryptGiftSecret(link, key),
      additionalInfo: cleanAdditionalInfo(rawInfo),
      deliveredBy: staffId,
    });

    let location: DeliveryLocation;
    try {
      location = await linkDeliveryMessageService.publish(locked);
    } catch (err) {
      await giftDeliveryRepository.markFailed(
        locked.deliveryId,
        err instanceof GiftClaimError ? err.code : "PUBLISH_FAILED",
      );
      throw err;
    }

    const ready = await giftDeliveryRepository.markReady(locked.deliveryId, location);
    await giftDeliveriesChannel.post(locked.guildId, {
      content: M.log.linkReady(
        locked.userId,
        staffId,
        locked.claimId,
        location.deliveryPath === LinkDeliveryPath.DM
          ? M.log.whereDm
          : M.log.whereChannel(location.deliveryChannelId),
      ),
    });
    log.info(`link delivery ${locked.deliveryId} ready via ${location.deliveryPath}`);
    return { delivery: ready ?? locked, location };
  }

  async reveal(deliveryId: string, userId: string): Promise<RevealedGift> {
    const delivery = await giftDeliveryRepository.findById(deliveryId);
    if (!delivery) throw new GiftClaimError("GIFT_DELIVERY_GONE", M.errors.notAvailable);
    if (delivery.userId !== userId) {
      log.warn(`gift delivery ${deliveryId} reveal refused for ${userId}`);
      throw new GiftClaimError("GIFT_DELIVERY_NOT_OWNER", M.errors.notOwner);
    }

    const claimed = await giftDeliveryRepository.claimReady(deliveryId, userId);
    if (!claimed) {
      const fresh = await giftDeliveryRepository.findById(deliveryId);
      throw new GiftClaimError(
        "GIFT_DELIVERY_UNAVAILABLE",
        fresh?.status === GiftDeliveryStatus.CLAIMED ? M.errors.alreadyClaimed : M.errors.notAvailable,
      );
    }

    const link = claimed.secret ? decryptGiftSecret(claimed.secret, secretKey()) : null;
    if (!link) {
      log.error(`gift delivery ${deliveryId} could not be decrypted`);
      throw new GiftClaimError("GIFT_DELIVERY_UNREADABLE", M.errors.notAvailable);
    }

    await linkDeliveryMessageService.showClaimed(claimed);
    await giftDeliveriesChannel.post(claimed.guildId, {
      content: M.log.linkClaimed(claimed.userId, claimed.claimId),
    });
    log.info(`link delivery ${deliveryId} claimed by ${userId}`);
    return { link, info: claimed.additionalInfo ?? null, delivery: claimed };
  }
}

export const linkDeliveryService = new LinkDeliveryService();
