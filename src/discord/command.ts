import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionResolvable,
} from "discord.js";

export interface SlashCommand {
  data: { name: string; toJSON: () => unknown };

  requiredPermissions?: PermissionResolvable;

  guildOnly?: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;

  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export function defineCommand(command: SlashCommand): SlashCommand {
  return command;
}
