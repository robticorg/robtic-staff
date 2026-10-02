import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";

const M = ticketMessages.claimerOffDuty;

export function buildClaimerOffDutyNotice(input: {
  ticketId: string;
  staffId: string;
  onBreak: boolean;
  pingRoleIds: readonly string[];
  claimable: boolean;
  movedToId?: string | null;
}): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.warning);
  container.addTextDisplayComponents((t) => t.setContent(M.title(input.staffId, input.onBreak)));
  container.addTextDisplayComponents((t) => t.setContent(input.movedToId ? M.movedTo(input.movedToId) : M.body));
  if (input.pingRoleIds.length > 0) {
    container.addTextDisplayComponents((t) => t.setContent(M.rolesPing(input.pingRoleIds)));
  }
  if (input.claimable) {
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TicketCustomId.claim(input.ticketId))
          .setLabel(M.claimButton)
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { roles: [...input.pingRoleIds] },
  } as BaseMessageOptions;
}
