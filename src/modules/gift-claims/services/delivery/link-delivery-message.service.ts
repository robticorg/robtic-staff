import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type BaseMessageOptions,
  type Guild,
  type OverwriteResolvable,
} from "discord.js";
import { logger } from "../../../../shared/utils/logger.ts";
import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { channelConfigService } from "../../../configuration/index.ts";
import { ChannelConfigType } from "../../../configuration/types/enums.ts";
import { GiftClaimCustomId } from "../../handlers/component-ids.ts";
import type { GiftDelivery } from "../../models/gift-delivery.model.ts";
import { buildLinkDeliveryMessage } from "../../render/delivery-components.ts";
import { requireGiftClaimClient } from "../../runtime.ts";
import { GiftDeliveryStatus, LinkDeliveryPath } from "../../types/enums.ts";
import { giftClaimPermissionService } from "../gift-claim-permissions.ts";
import { GiftClaimError } from "../gift-claim.service.ts";
import { giftDeliveryRepository, type DeliveryLocation } from "./gift-delivery.repository.ts";

const log = logger.child("gift-delivery:link-message");
const M = giftDeliveryMessages;

type DeliveryRef = Pick<
  GiftDelivery,
  | "deliveryId"
  | "guildId"
  | "claimId"
  | "userId"
  | "status"
  | "deliveryPath"
  | "deliveryChannelId"
  | "deliveryMessageId"
>;

export type EnsureOutcome = "OK" | "REPAIRED" | "SKIPPED";

interface Sendable {
  id: string;
  send: (options: BaseMessageOptions) => Promise<{ id: string; delete?: () => Promise<unknown> }>;
  messages?: { fetch: (id: string) => Promise<{ edit: (o: BaseMessageOptions) => Promise<unknown> }> };
  delete?: () => Promise<unknown>;
}

function payload(delivery: DeliveryRef, path: LinkDeliveryPath, claimed: boolean): BaseMessageOptions {
  const message = buildLinkDeliveryMessage({
    revealCustomId: GiftClaimCustomId.reveal(delivery.deliveryId),
    claimed,
    channelNotice: path === LinkDeliveryPath.CHANNEL ? M.user.linkReadyChannel(delivery.userId) : null,
  });
  return path === LinkDeliveryPath.CHANNEL && !claimed
    ? { ...message, allowedMentions: { users: [delivery.userId] } }
    : message;
}

export class LinkDeliveryMessageService {
  private readonly inFlight = new Set<string>();

  async publish(delivery: DeliveryRef): Promise<DeliveryLocation> {
    const viaDm = await this.sendDm(delivery);
    if (viaDm) return viaDm;
    return this.sendInNewChannel(delivery);
  }

  async ensure(delivery: DeliveryRef): Promise<EnsureOutcome> {
    if (delivery.status !== GiftDeliveryStatus.READY) return "SKIPPED";
    if (this.inFlight.has(delivery.deliveryId)) return "SKIPPED";
    this.inFlight.add(delivery.deliveryId);
    try {
      return await this.repair(delivery);
    } finally {
      this.inFlight.delete(delivery.deliveryId);
    }
  }

  async showClaimed(delivery: DeliveryRef): Promise<void> {
    if (!delivery.deliveryChannelId || !delivery.deliveryMessageId || !delivery.deliveryPath) return;
    const channel = await this.fetchSendable(delivery.deliveryChannelId);
    const message = await channel?.messages?.fetch(delivery.deliveryMessageId).catch(() => null);
    await message
      ?.edit(payload(delivery, delivery.deliveryPath, true))
      .catch((err) => log.warn(`claimed-state edit failed for ${delivery.deliveryId}`, err));
  }

  private async repair(delivery: DeliveryRef): Promise<EnsureOutcome> {
    const channel = delivery.deliveryChannelId
      ? await this.fetchSendable(delivery.deliveryChannelId)
      : null;

    if (channel && delivery.deliveryMessageId && delivery.deliveryPath) {
      const existing = await channel.messages?.fetch(delivery.deliveryMessageId).catch(() => null);
      if (existing) return "OK";

      const sent = await channel.send(payload(delivery, delivery.deliveryPath, false)).catch(() => null);
      if (sent) {
        return this.commit(delivery, {
          deliveryPath: delivery.deliveryPath,
          deliveryChannelId: channel.id,
          deliveryMessageId: sent.id,
        }, async () => void (await sent.delete?.().catch(() => undefined)));
      }
    }

    const location =
      delivery.deliveryPath === LinkDeliveryPath.CHANNEL
        ? await this.sendInNewChannel(delivery)
        : await this.publish(delivery);
    return this.commit(delivery, location, () => this.discard(location));
  }

  private async commit(
    delivery: DeliveryRef,
    location: DeliveryLocation,
    rollback: () => Promise<void>,
  ): Promise<EnsureOutcome> {
    const moved = await giftDeliveryRepository.moveLocation(
      delivery.deliveryId,
      delivery.deliveryMessageId,
      location,
    );
    if (!moved) {
      await rollback();
      return "SKIPPED";
    }
    log.info(`link delivery ${delivery.deliveryId} message restored (${location.deliveryPath})`);
    return "REPAIRED";
  }

  private async discard(location: DeliveryLocation): Promise<void> {
    const channel = await this.fetchSendable(location.deliveryChannelId);
    if (!channel) return;
    if (location.deliveryPath === LinkDeliveryPath.CHANNEL) {
      await channel.delete?.().catch(() => undefined);
      return;
    }
    const message = await channel.messages?.fetch(location.deliveryMessageId).catch(() => null);
    await (message as { delete?: () => Promise<unknown> } | null)?.delete?.().catch(() => undefined);
  }

  private async sendDm(delivery: DeliveryRef): Promise<DeliveryLocation | null> {
    try {
      const user = await requireGiftClaimClient().users.fetch(delivery.userId);
      const dm = await user.createDM();
      const message = await dm.send(payload(delivery, LinkDeliveryPath.DM, false));
      return {
        deliveryPath: LinkDeliveryPath.DM,
        deliveryChannelId: dm.id,
        deliveryMessageId: message.id,
      };
    } catch {
      log.info(`DM closed for gift delivery ${delivery.deliveryId} — falling back to a channel`);
      return null;
    }
  }

  private async sendInNewChannel(delivery: DeliveryRef): Promise<DeliveryLocation> {
    const guild = await this.guild(delivery.guildId);
    const categoryId = await channelConfigService.getChannelId(
      delivery.guildId,
      ChannelConfigType.GIFT_DELIVERY_CATEGORY,
    );
    const category = categoryId ? await guild.channels.fetch(categoryId).catch(() => null) : null;
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new GiftClaimError("GIFT_DELIVERY_CATEGORY_MISSING", M.errors.deliveryCategoryMissing);
    }

    const member = await guild.members.fetch(delivery.userId).catch(() => null);
    if (!member) throw new GiftClaimError("GIFT_DELIVERY_USER_GONE", M.errors.userGone);

    const channel = await guild.channels.create({
      name: `${giftClaimConfig.delivery.deliveryChannelPrefix}-${delivery.claimId}`.toLowerCase(),
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: await this.overwrites(guild, delivery.userId),
      reason: `Gift delivery ${delivery.deliveryId}`,
    });
    const message = await channel.send(payload(delivery, LinkDeliveryPath.CHANNEL, false));
    return {
      deliveryPath: LinkDeliveryPath.CHANNEL,
      deliveryChannelId: channel.id,
      deliveryMessageId: message.id,
    };
  }

  private async overwrites(guild: Guild, userId: string): Promise<OverwriteResolvable[]> {
    const view = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory];
    const managerRoles = [
      giftClaimPermissionService.panelSupportRoleId(),
      await giftClaimPermissionService.giftManagerRoleId(guild.id),
    ].filter((id): id is string => !!id && guild.roles.cache.has(id));

    return [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: userId,
        allow: [...view, PermissionFlagsBits.SendMessages],
        type: OverwriteType.Member,
      },
      ...[...new Set(managerRoles)].map(
        (id) => ({ id, allow: view, type: OverwriteType.Role }) as OverwriteResolvable,
      ),
      {
        id: guild.members.me?.id ?? guild.client.user.id,
        allow: [...view, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
        type: OverwriteType.Member,
      },
    ];
  }

  private async guild(guildId: string): Promise<Guild> {
    const client = requireGiftClaimClient();
    const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
    return guild;
  }

  private async fetchSendable(channelId: string): Promise<Sendable | null> {
    const channel = await requireGiftClaimClient().channels.fetch(channelId).catch(() => null);
    return channel && "send" in channel ? (channel as unknown as Sendable) : null;
  }
}

export const linkDeliveryMessageService = new LinkDeliveryMessageService();
