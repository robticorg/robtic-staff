import { MessageFlags, type ButtonInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { buildTicketNotice } from "../render/notice.ts";
import { ticketService } from "../services/ticket.service.ts";
import { StaffPointTransactionType, pointValuesService } from "../../staff/index.ts";

import { ticketName } from "../models/ticket.model.ts";
const log = logger.child("tickets:role-claim");
const M = ticketMessages;

export async function handleTicketRoleClaim(
  interaction: ButtonInteraction,
  ticketId: string,
  roleId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await ticketService.claimRole(ticketId, interaction.member, roleId);
    await interaction.editReply(
      result.pointAwarded
        ? M.claim.success(ticketName(result.ticket), await pointValuesService.valueOf(interaction.guildId, StaffPointTransactionType.TICKET_CLAIM))
        : M.claim.successNoPoint(ticketName(result.ticket)),
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
    log.error("role claim failed", err);
    await interaction.editReply(M.common.genericError);
  }
}
