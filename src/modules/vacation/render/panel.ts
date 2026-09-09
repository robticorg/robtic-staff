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
import { vacationPanel } from "../../../data/vacation/panel.ts";
import { VacCustomId } from "../handlers/component-ids.ts";

export function buildVacationPanel(): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(vacationPanel.accentColor);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(vacationPanel.title));
  for (const block of vacationPanel.body) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
  }
  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${vacationPanel.footer}`),
  );
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(VacCustomId.applyButton())
        .setLabel(vacationPanel.applyButton)
        .setStyle(ButtonStyle.Primary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
