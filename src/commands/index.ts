import type { SlashCommand } from "../discord/command.ts";
import scanCommand from "./scan/index.ts";
import pointsCommand from "./points/index.ts";
import warnSetupCommand from "./warn-setup/index.ts";
import leadCommand from "./lead/index.ts";
import whitelistCommand from "./whitelist/index.ts";
import helpCommand from "./help/index.ts";

// Roles, channels, points rules, Fast Access and the bot profile are set on the dashboard (robtic.org/discord), so
// their old slash commands are gone. Tickets belong to Robtic Tickets.
export const commands: SlashCommand[] = [
  scanCommand,
  pointsCommand,
  warnSetupCommand,
  leadCommand,
  whitelistCommand,
  helpCommand,
];
