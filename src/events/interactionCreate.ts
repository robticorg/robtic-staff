import { Events, type Interaction } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { commandMap } from "../discord/registry.ts";
import { handleGuardError } from "../commands/_shared/guards.ts";
import { handleInteractionError } from "../handlers/index.ts";
import { commonMessages } from "../data/messages/common.ts";
import { logger } from "../libs/logger/index.ts";

const log = logger.child("interaction");

export default defineEvent({
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isAutocomplete()) {
      const command = commandMap.get(interaction.commandName);
      try {
        await command?.autocomplete?.(interaction);
      } catch (err) {
        log.error(`/${interaction.commandName} autocomplete failed`, err);
        if (!interaction.responded) await interaction.respond([]).catch(() => undefined);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commandMap.get(interaction.commandName);
    if (!command) {
      log.warn(`No handler for /${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      if (await handleGuardError(interaction, err)) return;
      await handleInteractionError(interaction, err, {
        scope: "slash-command",
        action: interaction.commandName,
        fallbackMessage: commonMessages.errors.commandCrashed,
      });
    }
  },
});
