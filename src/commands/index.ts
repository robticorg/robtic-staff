import type { SlashCommand } from "../discord/command.ts";
import roleCommand from "./role/index.ts";
import channelsCommand from "./channels/index.ts";
import ticketSetupCommand from "./ticket-setup/index.ts";
import faqCommand from "./faq/index.ts";
import fastAccessCommand from "./fast-access/index.ts";
import staffSetupCommand from "./staff-setup/index.ts";
import scanCommand from "./scan/index.ts";
import pointsCommand from "./points/index.ts";
import sleepCommand from "./sleep/index.ts";
import ticketStatsCommand from "./ticket-stats/index.ts";
import promotePointsCommand from "./promote-points/index.ts";
import warnSetupCommand from "./warn-setup/index.ts";

export const commands: SlashCommand[] = [
  roleCommand,
  scanCommand,
  channelsCommand,
  ticketSetupCommand,
  faqCommand,
  fastAccessCommand,
  staffSetupCommand,
  pointsCommand,
  sleepCommand,
  ticketStatsCommand,
  promotePointsCommand,
  warnSetupCommand,
];
