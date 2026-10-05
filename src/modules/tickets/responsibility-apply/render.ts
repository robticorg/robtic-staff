import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CheckboxBuilder,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { responsibilityApplyMessages } from "../../../data/tickets/responsibility-apply.ts";
import type { TicketPanelContent } from "../models/ticket-panel-settings.model.ts";
import { ResponsibilityApplyCustomId, ResponsibilityApplyField } from "./component-ids.ts";

const P = responsibilityApplyMessages.panel;
const Q = responsibilityApplyMessages.modal;
const ANSWER_MAX = 1000;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function buildResponsibilityApplyPanel(content: TicketPanelContent = {}): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  const title = content.title?.trim() ? `## ${content.title.trim()}` : P.title;
  container.addTextDisplayComponents((t) => t.setContent(title), (t) => t.setContent(content.description?.trim() || P.description));
  if (content.image?.trim()) {
    const url = content.image.trim();
    container.addMediaGalleryComponents((gallery) => gallery.addItems((item) => item.setURL(url)));
  }
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ResponsibilityApplyCustomId.open())
        .setLabel(P.button)
        .setStyle(ButtonStyle.Primary),
    ),
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } } as BaseMessageOptions;
}

function paragraph(id: string, placeholder: string, minLength: number): TextInputBuilder {
  return new TextInputBuilder()
    .setCustomId(id)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(placeholder)
    .setMinLength(minLength)
    .setMaxLength(ANSWER_MAX)
    .setRequired(true);
}

export function buildResponsibilityApplyModal(
  responsibilities: readonly { responsibilityId: string; title: string; description: string }[],
): ModalBuilder {
  const select = new StringSelectMenuBuilder()
    .setCustomId(ResponsibilityApplyField.responsibility)
    .setPlaceholder(Q.responsibilityPlaceholder)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      responsibilities.slice(0, 25).map((r) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(clip(r.title, 100))
          .setDescription(clip(r.description || r.title, 100))
          .setValue(r.responsibilityId),
      ),
    );

  return new ModalBuilder()
    .setCustomId(ResponsibilityApplyCustomId.submit())
    .setTitle(clip(Q.title, 45))
    .addLabelComponents(
      new LabelBuilder().setLabel(Q.responsibilityLabel).setStringSelectMenuComponent(select),
      new LabelBuilder()
        .setLabel(Q.explainLabel)
        .setTextInputComponent(paragraph(ResponsibilityApplyField.explain, Q.explainPlaceholder, 10)),
      new LabelBuilder()
        .setLabel(Q.jobLabel)
        .setTextInputComponent(paragraph(ResponsibilityApplyField.job, Q.jobPlaceholder, 10)),
      new LabelBuilder()
        .setLabel(Q.situationLabel)
        .setDescription(Q.situationDescription)
        .setTextInputComponent(paragraph(ResponsibilityApplyField.situation, Q.situationPlaceholder, 30)),
      new LabelBuilder()
        .setLabel(Q.commitLabel)
        .setDescription(Q.commitDescription)
        .setCheckboxComponent(new CheckboxBuilder().setCustomId(ResponsibilityApplyField.commit)),
    );
}
