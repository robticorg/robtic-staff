import { Events, type Message, type PartialMessage } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { giftDeliveryRecoveryService } from "../modules/gift-claims/services/delivery/gift-delivery-recovery.service.ts";

export default defineEvent({
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage) {
    await giftDeliveryRecoveryService.onMessageDeleted(message.id);
  },
});
