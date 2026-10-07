import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { statsMessages } from "../../../data/messages/stats.ts";
import { pointValuesMessages as M } from "../../../data/messages/point-values.ts";
import { DEFAULT_POINT_VALUES } from "../config/points.ts";
import type { StaffPointTransactionType } from "../types/enums.ts";
import {
  POINT_VALUE_GROUPS,
  POINT_VALUE_GROUP_KEYS,
  PointValuesCustomId,
  type PointValueGroup,
} from "./config.ts";

type Values = Record<StaffPointTransactionType, number>;

export const pointTypeLabel = (type: StaffPointTransactionType): string =>
  statsMessages.pointTypeLabels[type] ?? type;

export function buildPointValuesPanel(values: Values) {
  const lines: string[] = [M.panel.title, M.panel.hint];
  for (const group of POINT_VALUE_GROUP_KEYS) {
    lines.push("", M.panel.groupHeading(M.groups[group]));
    for (const type of POINT_VALUE_GROUPS[group]) {
      lines.push(M.panel.row(pointTypeLabel(type), values[type], values[type] === DEFAULT_POINT_VALUES[type]));
    }
  }
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    POINT_VALUE_GROUP_KEYS.map((group) =>
      new ButtonBuilder()
        .setCustomId(PointValuesCustomId.open(group))
        .setLabel(M.groups[group])
        .setStyle(ButtonStyle.Primary),
    ),
  );
  return { content: lines.join("\n"), components: [buttons], flags: MessageFlags.Ephemeral } as const;
}

export function buildPointValuesModal(group: PointValueGroup, values: Values): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(PointValuesCustomId.modal(group))
    .setTitle(M.modalTitle(M.groups[group]).slice(0, 45))
    .addLabelComponents(
      POINT_VALUE_GROUPS[group].map((type) =>
        new LabelBuilder().setLabel(pointTypeLabel(type).slice(0, 45)).setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(type)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(M.inputPlaceholder(DEFAULT_POINT_VALUES[type]))
            .setValue(String(values[type]))
            .setMaxLength(5)
            .setRequired(true),
        ),
      ),
    );
}
