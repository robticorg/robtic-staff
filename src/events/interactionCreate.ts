import {
  ApplicationCommandOptionType,
  Events,
  type CommandInteractionOption,
  type Interaction,
} from "discord.js";
import { AppError } from "../libs/errors/index.ts";
import { ChannelConfigType } from "../modules/configuration/types/enums.ts";
import { CommandLogOutcome, commandLogService } from "../modules/command-log/index.ts";
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

    let outcome: CommandLogOutcome = CommandLogOutcome.SUCCESS;
    let detail: string | null = null;
    try {
      await command.execute(interaction);
    } catch (err) {
      detail = err instanceof AppError ? err.userMessage : err instanceof Error ? err.message : String(err);
      if (await handleGuardError(interaction, err)) {
        outcome = CommandLogOutcome.DENIED;
      } else {
        outcome = err instanceof AppError ? CommandLogOutcome.DENIED : CommandLogOutcome.ERROR;
        await handleInteractionError(interaction, err, {
          scope: "slash-command",
          action: interaction.commandName,
          fallbackMessage: commonMessages.errors.commandCrashed,
        });
      }
    }

    if (interaction.guild) {
      void commandLogService.record(interaction.guild, {
        slot: ChannelConfigType.COMMAND_LOG,
        invocation: interaction.toString(),
        actorId: interaction.user.id,
        channelId: interaction.channelId,
        targetIds: userOptionIds(interaction.options.data),
        outcome,
        detail,
      });
    }
  },
});

function userOptionIds(options: readonly CommandInteractionOption[]): string[] {
  const ids: string[] = [];
  for (const option of options) {
    if (option.type === ApplicationCommandOptionType.User && typeof option.value === "string") {
      ids.push(option.value);
    }
    if (option.options) ids.push(...userOptionIds(option.options));
  }
  return ids;
}
