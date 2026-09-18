import {
  MessageFlags,
  type ButtonInteraction,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import type { TicketDocument } from "../models/ticket.model.ts";
import { buildTicketNotice } from "../render/notice.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { canManageClosedTicket } from "../services/ticket-permissions.ts";
import { ticketService } from "../services/ticket.service.ts";
import { transcriptService } from "../services/transcript.service.ts";
import { TicketStatus } from "../types/enums.ts";

const log = logger.child("tickets:closed-panel");
const M = ticketMessages;
const P = ticketMessages.closedPanel;

const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

interface Resolved {
  ticket: TicketDocument;
  panel: TicketPanelConfig;
  member: GuildMember;
  guild: Guild;
}

async function resolve(
  interaction: ButtonInteraction,
  ticketId: string,
  requireClosed: boolean,
): Promise<Resolved | null> {
  if (!interaction.inCachedGuild()) return null;

  const ticket = await ticketService.getTicket(ticketId);
  if (!ticket || ticket.guildId !== interaction.guildId) {
    await interaction.reply({
      content: ticket ? M.common.wrongGuild : M.common.ticketGone,
      ...EPHEMERAL,
    });
    return null;
  }
  const panel = ticketConfigService.getPanel(ticket.panelId);
  if (!panel) {
    await interaction.reply({ content: M.create.unknownPanel, ...EPHEMERAL });
    return null;
  }
  if (!canManageClosedTicket(interaction.member, panel, ticket)) {
    await interaction.reply({ content: P.notAllowed, ...EPHEMERAL });
    return null;
  }
  if (requireClosed && ticket.status !== TicketStatus.CLOSED) {
    await interaction.reply({ content: P.notClosed, ...EPHEMERAL });
    return null;
  }
  return { ticket, panel, member: interaction.member, guild: interaction.guild };
}

export async function handleClosedTranscript(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  const resolved = await resolve(interaction, ticketId, false);
  if (!resolved) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { ticket } = resolved;
  let transcript = ticket.transcriptId
    ? await transcriptService.get(ticket.transcriptId)
    : await transcriptService.latestFor(ticket.ticketId);

  if (!transcript) {
    // A panel with `close.transcript: false` never cut one — build it from the
    // channel that is still sitting there.
    const channel = interaction.channel as GuildTextBasedChannel | null;
    transcript = await transcriptService.generate(ticket, channel).catch((err) => {
      log.warn(`on-demand transcript for ${ticketId} failed`, err);
      return null;
    });
    if (transcript) {
      await ticketService
        .updateOne({ ticketId }, { $set: { transcriptId: transcript.transcriptId } })
        .catch(() => undefined);
    }
  }

  if (!transcript) {
    await interaction.editReply(P.transcriptUnavailable);
    return;
  }

  await interaction.editReply({
    content: P.transcriptReady(ticketId),
    files: [transcriptService.toAttachment(transcript)],
  });
}

export async function handleClosedReopen(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  const resolved = await resolve(interaction, ticketId, true);
  if (!resolved) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await ticketService.reopenTicket(ticketId, resolved.member, resolved.panel);
    await interaction.editReply(M.reopen.done(ticketId));

    const channel = interaction.channel;
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send(buildTicketNotice([M.reopen.channelNote(interaction.user.id)], { tone: "success" }))
        .catch(() => undefined);
    }
    // The panel is stale the moment the ticket is live again, and a Components V2
    // message cannot be edited down to nothing — drop it instead.
    await interaction.message.delete().catch(() => undefined);
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error(`reopen failed for ${ticketId}`, err);
    await interaction.editReply(M.common.genericError);
  }
}

export async function handleClosedDelete(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  const resolved = await resolve(interaction, ticketId, false);
  if (!resolved) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await interaction.editReply(P.deleting);
    await ticketService.deleteTicket(
      ticketId,
      interaction.user.id,
      resolved.guild,
      resolved.panel,
    );
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error(`delete failed for ${ticketId}`, err);
    await interaction.editReply(M.common.genericError);
  }
}
