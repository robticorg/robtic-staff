import { ChannelType, Events, type Message } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";
import { handleDirectMessage, handleThreadMessage } from "../modules/modmail/handlers/index.ts";
import { transcriptCache } from "../modules/tickets/services/transcript-cache.ts";
import { runPrefixCommand } from "../commands/prefix/runner.ts";
import { runFastAccess } from "../modules/fast-access/index.ts";

const log = logger.child("messageCreate");

export default defineEvent({
  name: Events.MessageCreate,
  async execute(message: Message) {
    // Captured before the bot-message skip below — a ticket transcript needs
    // the bot's own embeds/replies too, not just what human members typed.
    if (!message.system) transcriptCache.record(message);

    if (message.author.bot || message.system) return;

    try {
      if (message.channel.type === ChannelType.DM) {
        await handleDirectMessage(message);
        return;
      }
      if (!message.inGuild()) return;

      if (await runFastAccess(message)) return;
      if (await runPrefixCommand(message)) return;

      await handleThreadMessage(message);
    } catch (err) {
      log.error("messageCreate handling failed", err);
    }
  },
});
