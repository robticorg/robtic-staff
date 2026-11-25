import type { PrefixCommand } from "../../discord/prefix-command.ts";

import staffAccept from "./staff/accept.ts";
import staffGiveaway from "./staff/giveaway.ts";
import staffDone from "./staff/done.ts";
import staffBots from "./staff/bots.ts";
import staffHidden from "./staff/hidden.ts";
import staffCome from "./staff/come.ts";
import staffTransfer from "./staff/transfer.ts";
import staffFire from "./staff/fire.ts";
import staffPrompt from "./staff/prompt.ts";
import staffDemote from "./staff/demote.ts";
import staffWarn from "./staff/warn.ts";
import staffUnwarn from "./staff/unwarn.ts";
import staffWarnings from "./staff/warnings.ts";
import staffWarns from "./staff/warns.ts";
import staffBreak from "./staff/break.ts";
import staffUnbreak from "./staff/unbreak.ts";
import staffStats from "./staff/stats.ts";
import staffPoints from "./staff/points.ts";
import staffLeaderboard from "./staff/leaderboard.ts";
import staffCheck from "./staff/check.ts";
import staffProfileCheck from "./staff/staff-check.ts";
import staffJail from "./staff/jail.ts";
import staffUnjail from "./staff/unjail.ts";
import staffBack from "./staff/back.ts";

// Ticket commands moved to Robtic Tickets.
export const prefixCommands: PrefixCommand[] = [
  staffCome,
  staffAccept,
  staffGiveaway,
  staffDone,
  staffBots,
  staffHidden,
  staffTransfer,
  staffFire,
  staffPrompt,
  staffDemote,
  staffWarn,
  staffUnwarn,
  staffWarnings,
  staffWarns,
  staffBreak,
  staffUnbreak,
  staffStats,
  staffPoints,
  staffLeaderboard,
  staffCheck,
  staffProfileCheck,
  staffJail,
  staffUnjail,
  staffBack,
];
