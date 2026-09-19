import {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { WarnPanelAction, warnPanelConfig } from "../../../data/warn-panel/config.ts";
import { warnPanelMessages } from "../../../data/warn-panel/messages.ts";
import { WarnPanelCustomId } from "../handlers/component-ids.ts";

const P = warnPanelMessages.panel;

const OPTIONS: readonly { action: WarnPanelAction; label: string; description: string }[] = [
  { action: WarnPanelAction.TIMEOUT, ...P.options.timeout },
  { action: WarnPanelAction.JAIL, ...P.options.jail },
  { action: WarnPanelAction.USER_WARN, ...P.options.userWarn },
  { action: WarnPanelAction.STAFF_WARN, ...P.options.staffWarn },
];

export function buildWarningPanel(): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(warnPanelConfig.panelAccentColor);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(P.title));
  for (const block of P.body) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
  }

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(WarnPanelCustomId.select())
        .setPlaceholder(P.selectPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          ...OPTIONS.map((o) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(o.label)
              .setDescription(o.description)
              .setValue(o.action),
          ),
        ),
    ),
  );

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${P.footer}`));

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}

export const WARNING_PANEL_OPTIONS = OPTIONS;
