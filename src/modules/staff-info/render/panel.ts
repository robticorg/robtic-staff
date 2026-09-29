import {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { staffInfoPanelContent as P } from "../../../data/staff-info/config.ts";
import { staffInfoMessages } from "../../../data/staff-info/messages.ts";
import { StaffInfoCustomId } from "../handlers/component-ids.ts";

export interface PanelEntry {
  infoId: string;
  name: string;
  description: string;
}

/** The public panel: banner image → text → the menu of infos. No accent colour. */
export function buildStaffInfoPanel(entries: readonly PanelEntry[]): BaseMessageOptions {
  const container = new ContainerBuilder();

  if (P.image.trim()) {
    container.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(P.image.trim())));
  }
  for (const block of P.text) {
    if (block.trim()) container.addTextDisplayComponents((t) => t.setContent(block));
  }

  if (entries.length === 0) {
    container.addTextDisplayComponents((t) => t.setContent(staffInfoMessages.panel.empty));
  } else {
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(StaffInfoCustomId.select())
          .setPlaceholder(P.selectPlaceholder)
          .addOptions(
            entries.slice(0, 25).map((e) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(e.name.slice(0, 100))
                .setDescription(e.description.slice(0, 100))
                .setValue(e.infoId),
            ),
          ),
      ),
    );
  }

  if (P.footer?.trim()) {
    container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents((t) => t.setContent(`-# ${P.footer}`));
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}
