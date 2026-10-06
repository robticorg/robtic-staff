import type { PrefixCommand } from "../../discord/prefix-command.ts";

import ticketClaim from "./ticket/claim.ts";
import ticketClose from "./ticket/close.ts";
import ticketDelete from "./ticket/delete.ts";
import ticketRename from "./ticket/rename.ts";
import ticketTranscript from "./ticket/transcript.ts";
import ticketAdd from "./ticket/add.ts";
import ticketRemove from "./ticket/remove.ts";
import ticketSleep from "./ticket/sleep.ts";
import ticketHandover from "./ticket/handover.ts";
import ticketInfo from "./ticket/info.ts";

import modmailEnd from "./modmail/end.ts";

import staffAccept from "./staff/accept.ts";
import staffFrom from "./staff/from.ts";
import staffRefuse from "./staff/refuse.ts";
import staffVerify from "./staff/verify.ts";
import staffGift from "./staff/gift.ts";
import staffSend from "./staff/send.ts";
import staffGiveaway from "./staff/giveaway.ts";
import staffDone from "./staff/done.ts";
import staffServer from "./staff/server.ts";
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
import staffResponsible from "./staff/responsible.ts";

export const prefixCommands: PrefixCommand[] = [
  ticketClaim,
  ticketClose,
  ticketDelete,
  ticketRename,
  ticketTranscript,
  ticketAdd,
  ticketRemove,
  ticketSleep,
  ticketHandover,
  ticketInfo,

  modmailEnd,

  staffCome,
  staffAccept,
  staffFrom,
  staffRefuse,
  staffVerify,
  staffSend,
  staffGiveaway,
  staffDone,
  staffServer,
  staffBots,
  staffHidden,
  staffGift,
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
  staffResponsible,
];
