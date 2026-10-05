import {
  ChannelSelectMenuBuilder,
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { TICKET_PANEL_KIND_VALUES, ticketSetupCommandMessages } from "../../../data/tickets/setup-command.ts";
import { PanelConfigCustomId, PanelConfigField } from "./component-ids.ts";

const M = ticketSetupCommandMessages;
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function buildSetupModal(panels: readonly Pick<TicketPanelConfig, "id" | "name" | "description">[]): ModalBuilder {
  const S = M.setupModal;
  return new ModalBuilder()
    .setCustomId(PanelConfigCustomId.setup())
    .setTitle(S.title)
    .addLabelComponents(
      new LabelBuilder().setLabel(S.typeLabel).setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId(PanelConfigField.type)
          .setPlaceholder(S.typePlaceholder)
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(
            panels.slice(0, 25).map((panel) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(clip(panel.name, 100))
                .setDescription(clip(panel.description || panel.id, 100))
                .setValue(panel.id),
            ),
          ),
      ),
      new LabelBuilder()
        .setLabel(S.supportLabel)
        .setDescription(S.supportDescription)
        .setRoleSelectMenuComponent(
          new RoleSelectMenuBuilder().setCustomId(PanelConfigField.support).setMinValues(1).setMaxValues(1),
        ),
      new LabelBuilder()
        .setLabel(S.managerLabel)
        .setDescription(S.managerDescription)
        .setRoleSelectMenuComponent(
          new RoleSelectMenuBuilder().setCustomId(PanelConfigField.manager).setMinValues(0).setMaxValues(1).setRequired(false),
        ),
      new LabelBuilder()
        .setLabel(S.categoryLabel)
        .setDescription(S.categoryDescription)
        .setChannelSelectMenuComponent(
          new ChannelSelectMenuBuilder()
            .setCustomId(PanelConfigField.category)
            .setChannelTypes(ChannelType.GuildCategory)
            .setMinValues(0)
            .setMaxValues(1)
            .setRequired(false),
        ),
    );
}

function optional(id: string, label: string, style: TextInputStyle, max: number): LabelBuilder {
  return new LabelBuilder().setLabel(label).setTextInputComponent(
    new TextInputBuilder()
      .setCustomId(id)
      .setStyle(style)
      .setPlaceholder(M.sendModal.optionalPlaceholder)
      .setMaxLength(max)
      .setRequired(false),
  );
}

export function buildSendModal(): ModalBuilder {
  const S = M.sendModal;
  return new ModalBuilder()
    .setCustomId(PanelConfigCustomId.send())
    .setTitle(S.title)
    .addLabelComponents(
      new LabelBuilder().setLabel(S.panelLabel).setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId(PanelConfigField.panel)
          .setPlaceholder(S.panelPlaceholder)
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(
            TICKET_PANEL_KIND_VALUES.map((kind) =>
              new StringSelectMenuOptionBuilder().setLabel(M.kinds[kind] ?? kind).setValue(kind),
            ),
          ),
      ),
      new LabelBuilder()
        .setLabel(S.channelLabel)
        .setDescription(S.channelDescription)
        .setChannelSelectMenuComponent(
          new ChannelSelectMenuBuilder()
            .setCustomId(PanelConfigField.channel)
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setMinValues(1)
            .setMaxValues(1),
        ),
      optional(PanelConfigField.title, S.titleLabel, TextInputStyle.Short, 100),
      optional(PanelConfigField.description, S.descriptionLabel, TextInputStyle.Paragraph, 2000),
      optional(PanelConfigField.image, S.imageLabel, TextInputStyle.Short, 500),
    );
}
