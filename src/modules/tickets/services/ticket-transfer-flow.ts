import type { GuildMember } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { buildTransferDm } from "../render/transfer-dm.ts";
import { ticketService, type TransferTicketResult } from "./ticket.service.ts";

const log = logger.child("tickets:transfer");
const M = ticketMessages.transfer;

export interface TicketTransferFlowInput {
  ticketId: string;
  actor: GuildMember;
  target: GuildMember;
  panel: TicketPanelConfig;
  reason: string;
}

export interface TicketTransferFlowOutcome {
  result: TransferTicketResult;
  dmDelivered: boolean;
  reply: string;
}

export async function performTicketTransfer(
  input: TicketTransferFlowInput,
): Promise<TicketTransferFlowOutcome> {
  const { ticketId, actor, target, panel, reason } = input;

  const result = await ticketService.transferTicket({ ticketId, actor, target, panel, reason });

  const dmDelivered = await notifyTarget(target, {
    ticketId,
    guildId: result.ticket.guildId,
    channelId: result.ticket.channelId,
    reason: result.reason,
  });

  await postChannelNote(actor, result, target);

  const done = M.done(ticketId, target.id);
  return {
    result,
    dmDelivered,
    reply: dmDelivered ? done : `${done}\n${M.dmFailed(target.id)}`,
  };
}

async function notifyTarget(
  target: GuildMember,
  input: { ticketId: string; guildId: string; channelId: string; reason: string },
): Promise<boolean> {
  try {
    await target.send(buildTransferDm(input));
    return true;
  } catch (err) {
    log.warn(`transfer DM to ${target.id} failed`, err);
    return false;
  }
}

async function postChannelNote(
  actor: GuildMember,
  result: TransferTicketResult,
  target: GuildMember,
): Promise<void> {
  const channel = await actor.guild.channels.fetch(result.ticket.channelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) return;

  await channel
    .send({
      content: M.channelNote(result.previousClaimerId, target.id, result.reason),
      allowedMentions: { users: [target.id] },
    })
    .catch(() => undefined);
}
