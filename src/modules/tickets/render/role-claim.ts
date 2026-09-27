import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { emojis } from "../../../data/emojis/index.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketClaimableRole } from "../models/ticket.model.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";
import { v2MessageOptions } from "./v2.ts";

const R = ticketMessages.roleClaim;

export function buildRoleClaimMessage(
  ticketId: string,
  slot: Pick<TicketClaimableRole, "roleId" | "claimedBy" | "closed">,
  ticketClaimerId?: string | null,
): BaseMessageOptions {
  const claimerId = slot.claimedBy ?? (slot.closed ? ticketClaimerId : null);
  const container = new ContainerBuilder().setAccentColor(
    claimerId ? colors.success : colors.info,
  );
  container.addTextDisplayComponents((t) =>
    t.setContent(claimerId ? R.claimedBy(claimerId) : R.waiting(slot.roleId)),
  );
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(TicketCustomId.roleClaim(ticketId, slot.roleId))
        .setLabel(R.button)
        .setEmoji(emojis.staff)
        .setStyle(ButtonStyle.Success)
        .setDisabled(!!claimerId || !!slot.closed),
    ),
  );
  return { ...v2MessageOptions(container), allowedMentions: { parse: [] } };
}
