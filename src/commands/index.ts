import type { SlashCommand } from "../discord/command.ts";
import roleCommand from "./role/index.ts";
import channelsCommand from "./channels/index.ts";
import faqCommand from "./faq/index.ts";
import fastAccessCommand from "./fast-access/index.ts";
import scanCommand from "./scan/index.ts";
import pointsCommand from "./points/index.ts";
import sleepCommand from "./sleep/index.ts";
import ticketStatsCommand from "./ticket-stats/index.ts";
import promotePointsCommand from "./promote-points/index.ts";
import warnSetupCommand from "./warn-setup/index.ts";
import autoclaimCommand from "./autoclaim/index.ts";
import intakeCommand from "./intake/index.ts";
import infoCommand from "./info/index.ts";
import addResCommand from "./add-res/index.ts";
import leadCommand from "./lead/index.ts";
import whitelistCommand from "./whitelist/index.ts";
import ticketCommand from "./ticket/index.ts";

export const commands: SlashCommand[] = [
  roleCommand,
  scanCommand,
  channelsCommand,
  faqCommand,
  fastAccessCommand,
  pointsCommand,
  sleepCommand,
  ticketStatsCommand,
  promotePointsCommand,
  warnSetupCommand,
  autoclaimCommand,
  intakeCommand,
  infoCommand,
  addResCommand,
  leadCommand,
  whitelistCommand,
  ticketCommand,
];
