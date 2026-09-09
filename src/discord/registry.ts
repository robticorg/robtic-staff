import type { SlashCommand } from "./command.ts";
import { commands } from "../commands/index.ts";

export const commandMap: Map<string, SlashCommand> = new Map(
  commands.map((command) => [command.data.name, command]),
);

export { commands };
