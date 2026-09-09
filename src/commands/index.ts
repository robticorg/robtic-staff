import type { SlashCommand } from "../discord/command.ts";
import roleCommand from "./role/index.ts";
import channelsCommand from "./channels/index.ts";
import ticketSetupCommand from "./ticket-setup/index.ts";
import faqCommand from "./faq/index.ts";
import fastAccessCommand from "./fast-access/index.ts";
import vacationSetupCommand from "./vacation-setup/index.ts";

export const commands: SlashCommand[] = [
  roleCommand,
  channelsCommand,
  ticketSetupCommand,
  faqCommand,
  fastAccessCommand,
  vacationSetupCommand,
];
