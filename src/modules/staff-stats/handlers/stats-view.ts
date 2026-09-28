import type { BaseMessageOptions, Guild } from "discord.js";
import {
  buildActionStatsView,
  buildRecentActivityView,
  buildStatsOverviewCard,
  buildTicketStatsView,
  buildWeeklyPointsView,
  type StatsCardIds,
} from "../render/stats-card.ts";
import { staffCardService } from "../services/staff-card.service.ts";
import { StatsView } from "./component-ids.ts";

/** Renders one view of the !stats card, or null when the target has no staff record. */
export async function renderStatsView(
  guild: Guild,
  ids: StatsCardIds,
  view: StatsView,
  page = 1,
): Promise<BaseMessageOptions | null> {
  const staff = await staffCardService.getStaff(guild.id, ids.targetId);
  if (!staff) return null;

  switch (view) {
    case StatsView.WEEKS:
      return buildWeeklyPointsView(ids, await staffCardService.weeklyPoints(staff, page));
    case StatsView.ACTIONS:
      return buildActionStatsView(ids, await staffCardService.actions(guild, staff));
    case StatsView.TICKETS:
      return buildTicketStatsView(ids, await staffCardService.tickets(guild.id, staff));
    case StatsView.RECENT:
      return buildRecentActivityView(ids, await staffCardService.recent(staff));
    case StatsView.HOME:
    default:
      return buildStatsOverviewCard(ids, await staffCardService.overview(guild, staff));
  }
}
