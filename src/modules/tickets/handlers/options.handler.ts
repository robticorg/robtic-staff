import { MessageFlags, type ButtonInteraction, type Guild, type GuildMember } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import type { TicketDocument } from "../models/ticket.model.ts";
import { buildTicketOptionsUi } from "../render/options-ui.ts";
import { buildAddUserModal, buildRemoveUserModal } from "../render/add-remove-modals.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { canManageTicket } from "../services/ticket-permissions.ts";
import { ticketService } from "../services/ticket.service.ts";

const log = logger.child("tickets:options");
const M = ticketMessages;

interface ResolvedTicket {
  ticket: TicketDocument;
  panel: TicketPanelConfig;
  member: GuildMember;
  guild: Guild;
}

async function resolve(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<ResolvedTicket | null> {
  if (!interaction.inCachedGuild()) return null;

  const ticket = await ticketService.getTicket(ticketId);
  if (!ticket || ticket.guildId !== interaction.guildId) {
    await reject(interaction, ticket ? M.common.wrongGuild : M.common.ticketGone);
    return null;
  }
  const panel = ticketConfigService.getPanel(ticket.panelId);
  if (!panel) {
    await reject(interaction, M.create.unknownPanel);
    return null;
  }
  if (!canManageTicket(interaction.member, panel, ticket)) {
    await reject(interaction, M.options.notAllowed);
    return null;
  }
  return { ticket, panel, member: interaction.member, guild: interaction.guild };
}

async function reject(interaction: ButtonInteraction, content: string): Promise<void> {
  const payload = { content, flags: MessageFlags.Ephemeral } as const;
  if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
  else await interaction.reply(payload);
}

export async function handleOptionsOpen(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  const resolved = await resolve(interaction, ticketId);
  if (!resolved) return;
  await interaction.reply(buildTicketOptionsUi(ticketId));
}

export async function handleOptionsAddUser(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  const resolved = await resolve(interaction, ticketId);
  if (!resolved) return;
  await interaction.showModal(buildAddUserModal(ticketId));
}

export async function handleOptionsRemoveUser(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  const resolved = await resolve(interaction, ticketId);
  if (!resolved) return;

  const entries = await ticketService.removableEntries(resolved.ticket, resolved.guild);
  if (entries.length === 0) {
    await interaction.reply({ content: M.removeUser.nothingToRemove, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(buildRemoveUserModal(ticketId, entries));
}

export async function handleOptionsClose(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  const resolved = await resolve(interaction, ticketId);
  if (!resolved) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const result = await ticketService.closeTicket(
      ticketId,
      interaction.user.id,
      resolved.panel,
      resolved.guild,
    );
    await ticketService.recordCompletionCredit(result.ticket).catch(() => undefined);
    await interaction.editReply(
      result.transcriptId ? M.close.withTranscript(ticketId) : M.close.done(ticketId),
    );
    if (!result.deleted) {
      const channel = interaction.channel;
      if (channel?.isTextBased() && "send" in channel) {
        await channel
          .send({ content: M.close.done(ticketId), allowedMentions: { parse: [] } })
          .catch(() => undefined);
      }
    }
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("close failed", err);
    await interaction.editReply(M.common.genericError);
  }
}
