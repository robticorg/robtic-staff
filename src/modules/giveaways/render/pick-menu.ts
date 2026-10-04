import {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { DateTime } from "luxon";
import { config } from "../../../config/index.ts";
import { colors } from "../../../data/config/colors.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { GiveawayCustomId } from "../handlers/component-ids.ts";

const D = giveawayMessages.done;

export interface PickableGiveaway {
  giveawayId: string;
  title?: string | null;
  channelName: string | null;
  endsAt: Date;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function formatGiveawayEnd(at: Date, zone: string = config.timezone): string {
  return DateTime.fromJSDate(at).setZone(zone).toFormat("yyyy-MM-dd HH:mm");
}

export function buildGiveawayPickMenu(
  executorId: string,
  userId: string,
  giveaways: readonly PickableGiveaway[],
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(D.pickTitle(userId)));
  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(GiveawayCustomId.done(executorId, userId))
        .setPlaceholder(D.pickPlaceholder)
        .addOptions(
          giveaways.slice(0, 25).map((giveaway, i) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(clip(D.optionLabel(giveaway.title ?? null, i + 1), 100))
              .setDescription(clip(D.optionDescription(giveaway.channelName, formatGiveawayEnd(giveaway.endsAt)), 100))
              .setValue(giveaway.giveawayId),
          ),
        ),
    ),
  );
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}

export function buildGiveawayPickResult(content: string, ok: boolean): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(ok ? colors.success : colors.warning);
  container.addTextDisplayComponents((t) => t.setContent(content));
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}
