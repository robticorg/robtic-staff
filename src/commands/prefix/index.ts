import type { PrefixCommand } from "../../discord/prefix-command.ts";

import ticketClaim from "./ticket/claim.ts";
import ticketClose from "./ticket/close.ts";
import ticketDelete from "./ticket/delete.ts";
import ticketRename from "./ticket/rename.ts";
import ticketTranscript from "./ticket/transcript.ts";
import ticketAdd from "./ticket/add.ts";
import ticketRemove from "./ticket/remove.ts";

import modmailEnd from "./modmail/end.ts";

import staffAccept from "./staff/accept.ts";
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

export const prefixCommands: PrefixCommand[] = [
  ticketClaim,
  ticketClose,
  ticketDelete,
  ticketRename,
  ticketTranscript,
  ticketAdd,
  ticketRemove,

  modmailEnd,

  staffAccept,
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
];
