import {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import {
  RESPONSIBILITY_CATEGORY_LABELS,
  RESPONSIBILITY_CATEGORY_ORDER,
  responsibilityLimits as L,
} from "../../../data/responsibilities/config.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { ResponsibilityCustomId } from "../handlers/component-ids.ts";
import type { Responsibility } from "../models/responsibility.model.ts";
import type { ResponsibilityCategory } from "../types/enums.ts";

type MenuResponsibility = Pick<Responsibility, "responsibilityId" | "title" | "description" | "category">;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function sortByCategory<T extends Pick<Responsibility, "category" | "title">>(rows: readonly T[]): T[] {
  const rank = (category: ResponsibilityCategory) => RESPONSIBILITY_CATEGORY_ORDER.indexOf(category);
  return [...rows].sort((a, b) => rank(a.category) - rank(b.category) || a.title.localeCompare(b.title));
}

function option(value: string, responsibility: MenuResponsibility): StringSelectMenuOptionBuilder {
  const category = RESPONSIBILITY_CATEGORY_LABELS[responsibility.category] ?? responsibility.category;
  return new StringSelectMenuOptionBuilder()
    .setLabel(clip(responsibility.title, 100))
    .setDescription(clip(`${category} · ${responsibility.description}`, L.menuDescriptionMaxLength))
    .setValue(value);
}

function menuMessage(heading: string, select: StringSelectMenuBuilder): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(heading));
  container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}

export function buildAssignMenu(
  executorId: string,
  targetId: string,
  responsibilities: readonly MenuResponsibility[],
): BaseMessageOptions {
  const M = responsibilityMessages.assign;
  return menuMessage(
    M.menuTitle(targetId),
    new StringSelectMenuBuilder()
      .setCustomId(ResponsibilityCustomId.assign(executorId, targetId))
      .setPlaceholder(M.menuPlaceholder)
      .addOptions(
        sortByCategory(responsibilities)
          .slice(0, L.menuMaxOptions)
          .map((r) => option(r.responsibilityId, r)),
      ),
  );
}

export function buildRemoveMenu(
  executorId: string,
  targetId: string,
  rows: readonly { assignmentId: string; responsibility: MenuResponsibility }[],
): BaseMessageOptions {
  const M = responsibilityMessages.remove;
  const sorted = sortByCategory(rows.map((row) => ({ ...row.responsibility, assignmentId: row.assignmentId })));
  return menuMessage(
    M.menuTitle(targetId),
    new StringSelectMenuBuilder()
      .setCustomId(ResponsibilityCustomId.remove(executorId, targetId))
      .setPlaceholder(M.menuPlaceholder)
      .addOptions(sorted.slice(0, L.menuMaxOptions).map((r) => option(r.assignmentId, r))),
  );
}

export function buildCategoryMenu(responsibilityId: string, content: string): BaseMessageOptions {
  return {
    content,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(ResponsibilityCustomId.category(responsibilityId))
          .setPlaceholder(responsibilityMessages.create.categoryPlaceholder)
          .addOptions(
            RESPONSIBILITY_CATEGORY_ORDER.map((category) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(RESPONSIBILITY_CATEGORY_LABELS[category])
                .setValue(category),
            ),
          ),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

export function buildMenuResult(content: string): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.success);
  container.addTextDisplayComponents((t) => t.setContent(content));
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}
