import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import {
  RESPONSIBILITY_CATEGORY_LABELS,
  responsibilityLimits as L,
} from "../../../data/responsibilities/config.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { ResponsibilityCustomId, ResponsibilityField } from "../handlers/component-ids.ts";
import type { Responsibility } from "../models/responsibility.model.ts";
import { sortByCategory } from "./menus.ts";

const M = responsibilityMessages.manage;

type PickableResponsibility = Pick<Responsibility, "responsibilityId" | "title" | "description" | "category">;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function buildManageCard(executorId: string, targetId: string): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(M.title(targetId)), (t) => t.setContent(M.hint));
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ResponsibilityCustomId.giveButton(executorId, targetId))
        .setLabel(M.giveButton)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(ResponsibilityCustomId.takeButton(executorId, targetId))
        .setLabel(M.takeButton)
        .setStyle(ButtonStyle.Danger),
    ),
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } } as BaseMessageOptions;
}

function pickModal(
  customId: string,
  title: string,
  label: string,
  options: readonly { value: string; responsibility: PickableResponsibility }[],
): ModalBuilder {
  const sorted = sortByCategory(options.map((o) => ({ ...o.responsibility, value: o.value }))).slice(0, L.menuMaxOptions);
  const select = new StringSelectMenuBuilder()
    .setCustomId(ResponsibilityField.pick)
    .setMinValues(1)
    .setMaxValues(sorted.length)
    .addOptions(
      sorted.map((r) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(clip(r.title, 100))
          .setDescription(
            clip(`${RESPONSIBILITY_CATEGORY_LABELS[r.category] ?? r.category} · ${r.description}`, L.menuDescriptionMaxLength),
          )
          .setValue(r.value),
      ),
    );
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addLabelComponents(new LabelBuilder().setLabel(label).setStringSelectMenuComponent(select));
}

export function buildGiveModal(executorId: string, targetId: string, responsibilities: readonly PickableResponsibility[]): ModalBuilder {
  return pickModal(
    ResponsibilityCustomId.giveModal(executorId, targetId),
    M.giveModalTitle,
    M.giveLabel,
    responsibilities.map((responsibility) => ({ value: responsibility.responsibilityId, responsibility })),
  );
}

export function buildTakeModal(
  executorId: string,
  targetId: string,
  rows: readonly { assignmentId: string; responsibility: PickableResponsibility }[],
): ModalBuilder {
  return pickModal(
    ResponsibilityCustomId.takeModal(executorId, targetId),
    M.takeModalTitle,
    M.takeLabel,
    rows.map((row) => ({ value: row.assignmentId, responsibility: row.responsibility })),
  );
}
