import {
  MessageFlags,
  type GuildMember,
  type GuildTextBasedChannel,
  type RepliableInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import type { Ticket, TicketAnswer } from "../models/ticket.model.ts";
import type { HydratedDocument } from "mongoose";
import { buildTicketMessage } from "../render/ticket-message.ts";
import { faqService } from "../services/faq.service.ts";
import { ticketService } from "../services/ticket.service.ts";

const log = logger.child("tickets:create-flow");
const M = ticketMessages;

export interface CreatedTicket {
  ticket: HydratedDocument<Ticket>;
  channel: GuildTextBasedChannel;
}

export async function runCreateTicket(
  interaction: RepliableInteraction,
  member: GuildMember,
  panel: TicketPanelConfig,
  answers: TicketAnswer[],
): Promise<CreatedTicket | null> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  try {
    const { ticket, channel } = await ticketService.createTicket({
      guild: member.guild,
      panel,
      member,
      answers,
    });

    const faqEntries = panel.faq.enabled ? await faqService.list(member.guild.id) : [];

    await channel
      .send({ content: `<@${member.id}>`, allowedMentions: { users: [member.id] } })
      .catch(() => undefined);
    await channel
      .send(buildTicketMessage(panel, ticket, faqEntries))
      .catch((err) => log.warn("ticket message send failed", err));

    await interaction.editReply({ content: M.create.created(channel.id) });
    return { ticket, channel };
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply({ content: `${friendly(err)}` }).catch(() => undefined);
      return null;
    }
    log.error("ticket creation failed", err);
    await interaction.editReply({ content: M.create.failed }).catch(() => undefined);
    return null;
  }
}

function friendly(err: DomainError): string {
  if (err.code === "CONFLICT") return err.message;
  if (err.code === "TICKET_CATEGORY_INVALID") return M.create.categoryMissing;
  if (err.code === "TICKET_PANEL_GONE") return M.create.unknownPanel;
  return M.create.failed;
}
