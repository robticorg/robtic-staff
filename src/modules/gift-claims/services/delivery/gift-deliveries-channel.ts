import type { AttachmentBuilder, MessageCreateOptions } from "discord.js";
import { logCardFromText, type LogTone } from "../../../../libs/discord/index.ts";
import type { GuildId } from "../../../../shared/types/index.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { channelConfigService } from "../../../configuration/index.ts";
import { ChannelConfigType } from "../../../configuration/types/enums.ts";
import { requireGiftClaimClient } from "../../runtime.ts";
import { GiftClaimError } from "../gift-claim.service.ts";

const log = logger.child("gift-delivery:channel");

export interface SendableChannel {
  id: string;
  send: (options: MessageCreateOptions | string) => Promise<{ id: string }>;
}

export class GiftDeliveriesChannel {
  async resolve(guildId: GuildId): Promise<SendableChannel> {
    const channelId = await channelConfigService.getChannelId(
      guildId,
      ChannelConfigType.GIFT_DELIVERIES,
    );
    const channel = channelId
      ? await requireGiftClaimClient().channels.fetch(channelId).catch(() => null)
      : null;
    if (!channel || !("send" in channel)) {
      throw new GiftClaimError(
        "GIFT_DELIVERIES_CHANNEL_MISSING",
        giftDeliveryMessages.errors.deliveriesChannelMissing,
      );
    }
    return channel as unknown as SendableChannel;
  }

  /**
   * A delivery log entry, sent as a V2 card (first line = title). Proof files are
   * shown inside the card. The autoclaim transfer's own message is NOT sent through
   * here — it goes straight to the channel as plain text because its id is part of
   * the transfer request.
   */
  async post(
    guildId: GuildId,
    entry: { content: string; files?: AttachmentBuilder[]; tone?: LogTone },
  ): Promise<string | null> {
    try {
      const channel = await this.resolve(guildId);
      const message = await channel.send(
        logCardFromText(entry.content, entry.tone ?? "info", { files: entry.files ?? [] }),
      );
      return message.id;
    } catch (err) {
      log.warn(`deliveries channel post failed in ${guildId}`, err);
      return null;
    }
  }
}

export const giftDeliveriesChannel = new GiftDeliveriesChannel();
