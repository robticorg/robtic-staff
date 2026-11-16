import { Events, type Message } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";
import { transcriptCache } from "../modules/tickets/services/transcript-cache.ts";
import { ticketSleepService } from "../modules/tickets/services/ticket-sleep.service.ts";
import { runPrefixCommand } from "../commands/prefix/runner.ts";
import { runFastAccess } from "../modules/fast-access/index.ts";
import { giveawayService } from "../modules/giveaways/index.ts";

const log = logger.child("messageCreate");

export default defineEvent({
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (!message.system) transcriptCache.record(message);

    if (message.author.bot && !message.system && message.inGuild()) {
      await giveawayService
        .handleBotMessage(message)
        .catch((err) => log.warn("giveaway winner check failed", err));
      return;
    }
    if (message.author.bot || message.system) return;

    try {
      if (!message.inGuild()) return;

      await ticketSleepService.handleTicketMessage(message);

      if (await runFastAccess(message)) return;
      await runPrefixCommand(message);
    } catch (err) {
      log.error("messageCreate handling failed", err);
    }
  },
});
