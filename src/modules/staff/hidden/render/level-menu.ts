import {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../../data/config/colors.ts";
import { hiddenStaffMessages } from "../../../../data/hidden-staff/messages.ts";
import { HiddenCustomId } from "../handlers/component-ids.ts";
import type { HiddenLevel } from "../services/hidden-staff-hierarchy.ts";

const C = hiddenStaffMessages.command;
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function buildHiddenLevelMenu(executorId: string, targetId: string, levels: readonly HiddenLevel[]): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(C.pickTitle(targetId)));
  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(HiddenCustomId.setLevel(executorId, targetId))
        .setPlaceholder(C.pickPlaceholder)
        .addOptions(
          levels.slice(0, 25).map((rung) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(clip(rung.name, 100))
              .setDescription(C.optionDescription(rung.level, levels.length))
              .setValue(String(rung.level)),
          ),
        ),
    ),
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } } as BaseMessageOptions;
}

export function buildHiddenResult(content: string, ok: boolean): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(ok ? colors.success : colors.warning);
  container.addTextDisplayComponents((t) => t.setContent(content));
  return { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } } as BaseMessageOptions;
}
