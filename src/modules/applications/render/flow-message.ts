import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type InteractionReplyOptions,
  type InteractionUpdateOptions,
} from "discord.js";
import { staffApplicationConfig } from "../../../data/staff-application/config.ts";

export interface FlowSelect {
  customId: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
}

export interface FlowButton {
  customId: string;
  label: string;
}

export interface FlowMessageInput {
  blocks: readonly string[];
  button?: FlowButton;
  select?: FlowSelect;
}

function container(input: FlowMessageInput): ContainerBuilder {
  const box = new ContainerBuilder().setAccentColor(staffApplicationConfig.accentColor);
  // Discord rejects an empty text block, which would stop the whole step from sending.
  for (const block of input.blocks) {
    if (block.trim()) box.addTextDisplayComponents((t) => t.setContent(block));
  }

  if (input.select) {
    const select = input.select;
    box.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(select.customId)
          .setPlaceholder(select.placeholder)
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(
            select.options.map((option) =>
              new StringSelectMenuOptionBuilder().setLabel(option.label).setValue(option.value),
            ),
          ),
      ),
    );
  }
  if (input.button) {
    box.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(input.button.customId)
          .setLabel(input.button.label)
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }
  return box;
}

export function flowReply(input: FlowMessageInput): InteractionReplyOptions {
  return {
    components: [container(input)],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  };
}

export function flowUpdate(input: FlowMessageInput): InteractionUpdateOptions {
  return {
    components: [container(input)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as InteractionUpdateOptions;
}
