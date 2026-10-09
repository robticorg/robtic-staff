import { MessageFlags, type ButtonInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { buildTicketNotice } from "../render/notice.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { ticketService } from "../services/ticket.service.ts";
import { StaffPointTransactionType, pointValuesService } from "../../staff/index.ts";

import { ticketName } from "../models/ticket.model.ts";
const log = logger.child("tickets:claim");
const M = ticketMessages;

export async function handleTicketClaim(
  interaction: ButtonInteraction,
  ticketId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const ticket = await ticketService.getTicket(ticketId);
    if (!ticket) {
      await interaction.editReply(M.common.ticketGone);
      return;
    }
    if (ticket.guildId !== interaction.guildId) {
      await interaction.editReply(M.common.wrongGuild);
      return;
    }
    const panel = ticketConfigService.getPanel(ticket.panelId, ticket.guildId);
    if (!panel) {
      await interaction.editReply(M.create.unknownPanel);
      return;
    }

    const result = await ticketService.claimTicket(ticketId, interaction.member, panel);
    await interaction.editReply(
      result.pointAwarded
        ? M.claim.success(ticketName(ticket), await pointValuesService.valueOf(ticket.guildId, StaffPointTransactionType.TICKET_CLAIM))
        : M.claim.successNoPoint(ticketName(ticket)),
    );

    const channel = interaction.channel;
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send(
          buildTicketNotice([M.claim.threadNote(`<@${interaction.user.id}>`)], {
            tone: "success",
          }),
        )
        .catch(() => undefined);
    }
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("claim failed", err);
    await interaction.editReply(M.common.genericError);
  }
}
