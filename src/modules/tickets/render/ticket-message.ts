import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { emojis } from "../../../data/emojis/index.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import type { Faq } from "../models/faq.model.ts";
import type { Ticket } from "../models/ticket.model.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";
import { applyV2Content, v2MessageOptions } from "./v2.ts";

const M = ticketMessages;

export function shouldShowFaqMenu(panel: TicketPanelConfig, faqCount: number): boolean {
  return panel.faq.enabled && faqCount > 0;
}

export function buildTicketMessage(
  panel: TicketPanelConfig,
  ticket: Pick<Ticket, "ticketId" | "userId" | "answers">,
  faqEntries: readonly Faq[],
): BaseMessageOptions {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents((t) =>
    t.setContent(M.create.channelHeader(ticket.ticketId, panel.name)),
  );
  container.addTextDisplayComponents((t) => t.setContent(M.create.openedBy(ticket.userId)));

  applyV2Content(container, panel.ticketMessage);

  if (ticket.answers.length > 0) {
    container.addSeparatorComponents((s) => s.setDivider(true));
    container.addTextDisplayComponents((t) => t.setContent(M.create.answersHeading));
    for (const a of ticket.answers) {
      container.addTextDisplayComponents((t) =>
        t.setContent(M.create.answerLine(a.question, truncate(a.answer, 900))),
      );
    }
  }

  container.addSeparatorComponents((s) => s.setDivider(true));
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(TicketCustomId.claim(ticket.ticketId))
        .setLabel(M.ticketButtons.claim)
        .setEmoji(emojis.staff)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(TicketCustomId.options(ticket.ticketId))
        .setLabel(M.ticketButtons.options)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  if (shouldShowFaqMenu(panel, faqEntries.length)) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(TicketCustomId.faqSelect(ticket.ticketId))
      .setPlaceholder(M.faq.selectPlaceholder)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        faqEntries
          .slice(0, limits.selectMenuMaxOptions)
          .map((faq) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(faq.question.slice(0, 100))
              .setValue(faq.faqId),
          ),
      );
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    );
  }

  return v2MessageOptions(container);
}

function truncate(v: string, max: number): string {
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}
