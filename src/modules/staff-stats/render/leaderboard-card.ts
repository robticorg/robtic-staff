import {
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { statsMessages as S } from "../../../data/messages/stats.ts";
import { STATS_PERIOD_LABEL } from "../types/enums.ts";
import type { LeaderboardEntry, StatsPeriod } from "../types/index.ts";

export function buildLeaderboardCard(result: {
  period: StatsPeriod;
  entries: LeaderboardEntry[];
  totalRanked: number;
}): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(S.lbHeader(STATS_PERIOD_LABEL[result.period])),
  );

  const body = result.entries.length
    ? result.entries
        .map((e) => S.lbRow(S.lbMedal(e.rank), e.staffId, e.points))
        .join("\n")
    : S.leaderboardEmpty;
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
