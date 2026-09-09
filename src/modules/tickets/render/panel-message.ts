import {
  ActionRowBuilder,
  ContainerBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketMainConfig, TicketPanelConfig } from "../../../data/tickets/index.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";
import { applyV2Content, v2MessageOptions } from "./v2.ts";

export function buildTicketPanelMessage(
  main: TicketMainConfig,
  panels: readonly TicketPanelConfig[],
): BaseMessageOptions {
  const container = new ContainerBuilder();
  applyV2Content(container, main.content);

  const options = panels
    .slice(0, limits.selectMenuMaxOptions)
    .map((panel) => {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(panel.name.slice(0, 100))
        .setDescription(panel.description.slice(0, 100))
        .setValue(panel.id);
      if (panel.emoji) option.setEmoji(panel.emoji);
      return option;
    });

  const select = new StringSelectMenuBuilder()
    .setCustomId(TicketCustomId.panelSelect())
    .setPlaceholder(main.selectPlaceholder || ticketMessages.panel.selectPlaceholderFallback)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
  );

  return v2MessageOptions(container);
}
