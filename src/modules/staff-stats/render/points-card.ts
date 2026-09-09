import {
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { statsMessages as S } from "../../../data/messages/stats.ts";

const BREAKDOWN_ORDER = [
  "TICKET_CLAIM",
  "REPORT_CLAIM",
  "GIFT_CLAIM",
  "USER_WARNING",
  "STAFF_WARNING",
  "APPEAL_SUCCESS_PENALTY",
  "MANUAL_ADJUSTMENT",
  "OTHER",
];

export interface PointsCardData {
  allTime: number;
  week: number;
  weekBreakdown: Record<string, number>;
}

export function buildPointsCard(userId: string, data: PointsCardData): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(S.points.heading(userId)));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [S.points.allTime(data.allTime), S.points.weekly(data.week)].join("\n"),
    ),
  );

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  const rows = BREAKDOWN_ORDER.filter((type) => (data.weekBreakdown[type] ?? 0) !== 0).map((type) =>
    S.points.breakdownRow(S.pointTypeLabels[type] ?? type, data.weekBreakdown[type] ?? 0),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(rows.length ? rows.join("\n") : S.points.breakdownEmpty),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
