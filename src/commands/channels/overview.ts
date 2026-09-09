import type { ChannelId } from "../../shared/types/index.ts";
import { CHANNEL_CONFIG_TYPE_VALUES, ChannelConfigType } from "../../modules/configuration/index.ts";
import {
  CHANNEL_GROUP_ORDER,
  CHANNEL_SLOT_META,
  CHANNEL_TYPE_CHOICES,
} from "../../data/channels/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { branding } from "../../data/config/branding.ts";

export const CHANNEL_CHOICES = CHANNEL_TYPE_CHOICES;

export function renderChannelOverview(
  map: Partial<Record<ChannelConfigType, ChannelId>>,
): string {
  const out: string[] = [configMessages.channels.overviewTitle(branding.botName)];

  for (const group of CHANNEL_GROUP_ORDER) {
    out.push("", configMessages.channels.group(group));
    for (const type of CHANNEL_CONFIG_TYPE_VALUES) {
      const meta = CHANNEL_SLOT_META[type];
      if (meta.group !== group) continue;
      const channelId = map[type];
      out.push(
        configMessages.channels.entry(
          meta.label,
          channelId
            ? configMessages.channels.channelMention(channelId)
            : configMessages.channels.notConfigured,
        ),
      );
    }
  }

  return out.join("\n");
}
