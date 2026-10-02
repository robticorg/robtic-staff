import type { GuildId } from "../../../../shared/types/index.ts";
import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { GiftClaimModel } from "../../models/gift-claim.model.ts";
import { GiftClaimError } from "../gift-claim.service.ts";

export function cooldownEndsAt(lastAt: Date | null, now: Date, cooldownMs: number): Date | null {
  if (!lastAt) return null;
  const endsAt = new Date(lastAt.getTime() + cooldownMs);
  return endsAt > now ? endsAt : null;
}

export class GiftCommandCooldown {
  async lastGiftAt(guildId: GuildId, ticketId: string): Promise<Date | null> {
    const last = await GiftClaimModel.findOne({ guildId, ticketId }, { createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return last?.createdAt ?? null;
  }

  async assertReady(guildId: GuildId, ticketId: string, now: Date = new Date()): Promise<void> {
    const endsAt = cooldownEndsAt(
      await this.lastGiftAt(guildId, ticketId),
      now,
      giftClaimConfig.delivery.commandCooldownMs,
    );
    if (endsAt) {
      throw new GiftClaimError("GIFT_COMMAND_COOLDOWN", giftDeliveryMessages.command.cooldown(endsAt));
    }
  }
}

export const giftCommandCooldown = new GiftCommandCooldown();
