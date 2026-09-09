import type { Message } from "discord.js";
import { channelConfigService } from "../../../modules/configuration/index.ts";
import { ChannelConfigType } from "../../../modules/configuration/types/enums.ts";
import type { WarnChannelConfig } from "../../../modules/warnings/services/warn-channels.ts";

export async function loadWarnChannels(guildId: string): Promise<WarnChannelConfig> {
  const [userWarnsChannelId, staffWarnsChannelId] = await Promise.all([
    channelConfigService.getChannelId(guildId, ChannelConfigType.USER_WARNS),
    channelConfigService.getChannelId(guildId, ChannelConfigType.STAFF_WARNS),
  ]);
  return { userWarnsChannelId, staffWarnsChannelId };
}

export function evidenceUrls(message: Message): string[] {
  return [...message.attachments.values()].map((a) => a.url);
}

export function textAfterTarget(rest: string): string {
  return rest
    .replace(/^\s*<@!?\d{17,20}>\s*/, "")
    .replace(/^\s*\d{17,20}\s*/, "")
    .trim();
}
