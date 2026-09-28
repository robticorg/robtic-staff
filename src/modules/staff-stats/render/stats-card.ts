import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { ACTIVITY_LABELS, statsMessages as S } from "../../../data/messages/stats.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import { ticketConfigService } from "../../tickets/services/ticket-config.service.ts";
import { StatsView, statsCustomId } from "../handlers/component-ids.ts";
import type {
  StaffActionStats,
  StaffCardOverview,
  WeeklyPointsPage,
} from "../services/staff-card.service.ts";
import type { RecentActivityItem } from "../services/staff-statistics.service.ts";
import type { TicketStatRow } from "../services/stats-repository.ts";

const C = S.card;
const B = C.buttons;

const POINT_TYPE_ORDER = [
  "TICKET_CLAIM",
  "REPORT_CLAIM",
  "GIFT_CLAIM",
  "USER_WARNING",
  "STAFF_WARNING",
  "APPEAL_SUCCESS_PENALTY",
  "MANUAL_ADJUSTMENT",
  "OTHER",
];

export interface StatsCardIds {
  viewerId: string;
  targetId: string;
}

function rel(at: Date): string {
  return `<t:${Math.floor(at.getTime() / 1000)}:R>`;
}

function button(
  ids: StatsCardIds,
  view: StatsView,
  label: string,
  options: { page?: number; style?: ButtonStyle; disabled?: boolean; tag?: string } = {},
): ButtonBuilder {
  // `tag` keeps custom ids unique when two buttons point at the same view (prev/next on page edges).
  const page = options.page ?? 1;
  return new ButtonBuilder()
    .setCustomId(`${statsCustomId({ view, ...ids, page })}${options.tag ? `:${options.tag}` : ""}`)
    .setLabel(label)
    .setStyle(options.style ?? ButtonStyle.Secondary)
    .setDisabled(options.disabled ?? false);
}

function finish(container: ContainerBuilder): BaseMessageOptions {
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}

function subView(ids: StatsCardIds, heading: string, body: string, extra: ButtonBuilder[] = []) {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(heading));
  container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((t) => t.setContent(body));
  container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents((row) =>
    row.addComponents(button(ids, StatsView.HOME, B.back, { style: ButtonStyle.Primary }), ...extra),
  );
  return finish(container);
}

export function overviewLines(o: StaffCardOverview): string[] {
  const lines = [C.tier(STAFF_TIER_LABELS[o.tier] ?? o.tier)];
  if (o.staffType) lines.push(C.staffType(staffTypeLabel(o.staffType)));
  if (o.fired) {
    lines.push(C.lastRoleBeforeFire(o.fired.roleId, o.fired.level));
  } else {
    lines.push(C.levelRole(o.roleId, o.level));
  }
  lines.push(C.acceptedBy(o.acceptedBy));
  if (o.acceptedAt) lines.push(C.acceptedAt(o.acceptedAt));
  lines.push(C.status(C.statuses[o.status] ?? o.status));
  if (o.fired) lines.push(C.firedBy(o.fired.by, o.fired.at));
  lines.push(C.totalPoints(o.totalPoints));
  return lines;
}

export function buildStatsOverviewCard(ids: StatsCardIds, o: StaffCardOverview): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(o.fired ? colors.error : colors.primary);
  const title = C.title(o.userId);
  const body = overviewLines(o).join("\n");

  if (o.avatarUrl) {
    const avatarUrl = o.avatarUrl;
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((t) => t.setContent(title), (t) => t.setContent(body))
        .setThumbnailAccessory((thumb) => thumb.setURL(avatarUrl)),
    );
  } else {
    container.addTextDisplayComponents((t) => t.setContent(title), (t) => t.setContent(body));
  }

  container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents((row) =>
    row.addComponents(
      button(ids, StatsView.WEEKS, B.weeks, { style: ButtonStyle.Primary }),
      button(ids, StatsView.ACTIONS, B.actions),
      button(ids, StatsView.TICKETS, B.tickets),
      button(ids, StatsView.RECENT, B.recent),
    ),
  );
  return finish(container);
}

export function buildWeeklyPointsView(ids: StatsCardIds, data: WeeklyPointsPage): BaseMessageOptions {
  const blocks = [C.totalPoints(data.totalPoints), C.weeks.page(data.page, data.pages)];

  if (data.weeks.length === 0) blocks.push(C.weeks.none);
  for (const week of data.weeks) {
    const rows = POINT_TYPE_ORDER.filter((type) => (week.breakdown[type] ?? 0) !== 0).map((type) =>
      S.points.breakdownRow(S.pointTypeLabels[type] ?? type, week.breakdown[type] ?? 0),
    );
    blocks.push(
      "",
      C.weeks.week(week.index, week.start, week.end, week.total),
      rows.length ? rows.join("\n") : C.weeks.empty,
    );
  }

  return subView(ids, C.weeks.heading(ids.targetId), blocks.join("\n"), [
    button(ids, StatsView.WEEKS, B.prev, {
      page: data.page - 1,
      disabled: data.page <= 1,
      tag: "p",
    }),
    button(ids, StatsView.WEEKS, B.next, {
      page: data.page + 1,
      disabled: data.page >= data.pages,
      tag: "n",
    }),
  ]);
}

export function buildActionStatsView(ids: StatsCardIds, a: StaffActionStats): BaseMessageOptions {
  const L = S.labels;
  const A = C.actions;
  const row = S.activityRow;

  const staffLines = [
    row(A.staffAccepted, a.staffAccepted),
    row(A.applicationsRefused, a.applicationsRefused),
    row(A.staffFired, a.staffFired),
    row(A.staffPromoted, a.staffPromoted),
    row(A.staffDemoted, a.staffDemoted),
  ];
  if (a.girlsVerified !== null) staffLines.push(row(A.girlsVerified, a.girlsVerified));

  const body = [
    A.reportsGroup,
    row(L.reportsClaimed, a.reportsClaimed),
    row(L.reportsCompleted, a.reportsCompleted),
    "",
    A.staffGroup,
    ...staffLines,
    "",
    A.punishGroup,
    row(A.jails, a.jails),
    row(L.userWarningsIssued, a.userWarningsIssued),
    row(L.staffWarningsIssued, a.staffWarningsIssued),
    row(L.warningsRevoked, a.warningsRevoked),
    row(L.appealsHandled, a.appealsHandled),
    "",
    A.otherGroup,
    row(L.giftClaimsHandled, a.giftClaimsHandled),
    row(A.vacationsDecided, a.vacationsDecided),
  ].join("\n");

  return subView(ids, A.heading(ids.targetId), body);
}

export function buildTicketStatsView(ids: StatsCardIds, t: TicketStatRow): BaseMessageOptions {
  const T = C.tickets;
  const panels = Object.entries(t.byPanel).sort((a, b) => b[1].claimed - a[1].claimed);
  const body = [T.totals(t.claimed, t.completed, t.assignedNow)];
  if (panels.length === 0) body.push("", T.empty);
  for (const [panelId, stat] of panels) {
    body.push("", T.panel(ticketConfigService.getPanel(panelId)?.name ?? panelId), T.panelRow(stat));
  }
  return subView(ids, T.heading(ids.targetId), body.join("\n"));
}

export function buildRecentActivityView(
  ids: StatsCardIds,
  items: readonly RecentActivityItem[],
): BaseMessageOptions {
  const body = items.length
    ? items.map((r) => S.recentRow(rel(r.at), ACTIVITY_LABELS[r.type] ?? r.type)).join("\n")
    : S.recentEmpty;
  return subView(ids, C.recent.heading(ids.targetId), body);
}
