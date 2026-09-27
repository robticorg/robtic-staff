import { logger } from "../../../../shared/utils/logger.ts";
import { giftDeliveryRepository } from "./gift-delivery.repository.ts";
import { linkDeliveryMessageService } from "./link-delivery-message.service.ts";

const log = logger.child("gift-delivery:recovery");

export class GiftDeliveryRecoveryService {
  async reconcileOnStartup(startedAt: Date = new Date()): Promise<void> {
    const released = await giftDeliveryRepository.releaseInterrupted(startedAt);
    if (released > 0) log.warn(`${released} gift delivery(ies) interrupted by a restart — marked retryable`);

    const ready = await giftDeliveryRepository.listReadyLinks();
    let repaired = 0;
    for (const delivery of ready) {
      try {
        if ((await linkDeliveryMessageService.ensure(delivery)) === "REPAIRED") repaired += 1;
      } catch (err) {
        log.error(`gift delivery ${delivery.deliveryId} could not be restored`, err);
      }
    }
    if (repaired > 0) log.info(`restored ${repaired} gift delivery message(s)`);
  }

  async onChannelDeleted(channelId: string): Promise<void> {
    for (const delivery of await giftDeliveryRepository.findByChannel(channelId)) {
      try {
        await linkDeliveryMessageService.ensure(delivery);
      } catch (err) {
        log.error(`gift delivery ${delivery.deliveryId} channel could not be restored`, err);
      }
    }
  }

  async onMessageDeleted(messageId: string): Promise<void> {
    const delivery = await giftDeliveryRepository.findByMessage(messageId);
    if (!delivery) return;
    try {
      await linkDeliveryMessageService.ensure(delivery);
    } catch (err) {
      log.error(`gift delivery ${delivery.deliveryId} message could not be restored`, err);
    }
  }
}

export const giftDeliveryRecoveryService = new GiftDeliveryRecoveryService();
