import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { staffSupportConfig } from "../../../data/staff-support/config.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { StaffSupportCustomId } from "../handlers/component-ids.ts";

const P = staffSupportMessages.panel;

/**
 * The single entry point for all three Staff Support workflows. Replaces the
 * old Break-only panel; Break Apply is now one of its three buttons.
 */
export function buildStaffSupportPanel(): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(staffSupportConfig.panelAccentColor);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(P.title));
  for (const block of P.body) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
  }
  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${P.footer}`));
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(StaffSupportCustomId.supportButton())
        .setLabel(P.supportButton)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(StaffSupportCustomId.breakButton())
        .setLabel(P.breakButton)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(StaffSupportCustomId.demissionButton())
        .setLabel(P.demissionButton)
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
