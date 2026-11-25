import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { ACTIVITY_LABELS, statsMessages as S } from "../../../data/messages/stats.ts";
import { leadMessages } from "../../../data/leads/messages.ts";
import { hiddenStaffMessages } from "../../../data/hidden-staff/messages.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import { MENU_VIEWS, StatsView, statsCustomId } from "../handlers/component-ids.ts";
import {
  StaffExitKind,
  type StaffActionStats,
  type StaffCardOverview,
  type WeeklyPointsPage,
} from "../services/staff-card.service.ts";
import type { CardLeads } from "../services/staff-card-leads.service.ts";
import type { RecentActivityItem } from "../services/staff-statistics.service.ts";

const C = S.card;
const B = C.buttons;

const POINT_TYPE_ORDER = [
  "TICKET_CLAIM",
  "GIFT_CLAIM",
  "MESSAGE",
  "USER_WARNING",
  "JAIL",
  "STAFF_ACCEPT",
  "SPECIAL_POST",
  "PRIVATE_CHANNEL_CREATE",
  "PRIVATE_CHANNEL_DELETE",
  "SELLER_ROLE",
  "STAFF_WARNING",
  "MANUAL_ADJUSTMENT",
  "OTHER",
];

export interface StatsCardIds {
  viewerId: string;
  targetId: string;
}

/** A point type's name: the known label, or the raw type made readable (SOME_TYPE → Some type). */
function pointTypeLabel(type: string): string {
  const known = S.pointTypeLabels[type];
  if (known) return known;
  const words = type.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
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

/**
 * The view picker shown on every page: a dropdown with a title and a short
 * description per view. The page being shown is pre-selected.
 */
function viewMenu(ids: StatsCardIds, current: StatsView): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId(statsCustomId({ view: StatsView.MENU, ...ids, page: 1 }))
    .setPlaceholder(C.menu.placeholder)
    .addOptions(
      MENU_VIEWS.map((view) => {
        const copy = C.menu.options[view]!;
        return new StringSelectMenuOptionBuilder()
          .setLabel(copy.label)
          .setDescription(copy.description)
          .setValue(view)
          .setDefault(view === current);
      }),
    );
}

function addMenu(container: ContainerBuilder, ids: StatsCardIds, current: StatsView): void {
  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(viewMenu(ids, current)),
  );
}

function subView(
  ids: StatsCardIds,
  current: StatsView,
  heading: string,
  body: string,
  extra: ButtonBuilder[] = [],
) {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(heading));
  container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((t) => t.setContent(body));
  container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  if (extra.length > 0) {
    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(extra));
  }
  addMenu(container, ids, current);
  return finish(container);
}

export function overviewLines(o: StaffCardOverview): string[] {
  const lines = [C.tier(STAFF_TIER_LABELS[o.tier] ?? o.tier)];
  if (o.staffType) lines.push(C.staffType(staffTypeLabel(o.staffType)));
  const resigned = o.fired?.kind === StaffExitKind.DEMISSION;
  const start = o.levelStart ?? 0;
  if (o.fired) {
    lines.push(
      resigned
        ? C.lastRoleBeforeLeaving(o.fired.roleId, o.fired.level + start)
        : C.lastRoleBeforeFire(o.fired.roleId, o.fired.level + start),
    );
  } else {
    lines.push(C.levelRole(o.roleId, o.level + start));
  }
  lines.push(C.acceptedBy(o.acceptedBy, o.acceptedAt));
  lines.push(
    C.status(o.fired ? (C.exitStatuses[o.fired.kind] ?? o.status) : (C.statuses[o.status] ?? o.status)),
  );
  if (o.hidden) lines.push(hiddenStaffMessages.stats.status, hiddenStaffMessages.stats.level(o.hidden.name));
  if (o.fired) {
    lines.push(resigned ? C.resignationApprovedBy(o.fired.by, o.fired.at) : C.firedBy(o.fired.by, o.fired.at));
    if (resigned && o.fired.reason) lines.push(C.resignationReason(o.fired.reason));
  }
  lines.push(C.totalPoints(o.totalPoints));
  if (o.breakPoints !== 0) lines.push(C.breakPoints(o.breakPoints));
  lines.push(...leadLines(o.leads));
  return lines;
}

/** Leads, only when the member has some: servers that don't use leads see nothing. */
export function leadLines(leads: CardLeads): string[] {
  const L = leadMessages.stats;
  const lines: string[] = [];
  if (leads.leadsOf.length) lines.push(L.yourLeads, ...leads.leadsOf.map((l) => L.leadRow(l.name, l.holder)));
  if (leads.leading.length) lines.push(L.leading, ...leads.leading.map((l) => L.leadingRow(l.name, l.target)));
  return lines.length ? ["", ...lines] : [];
}

export function buildStatsOverviewCard(ids: StatsCardIds, o: StaffCardOverview): BaseMessageOptions {
  // Red when fired, yellow when they resigned, blue while still staff.
  const accent = !o.fired
    ? colors.primary
    : o.fired.kind === StaffExitKind.DEMISSION
      ? colors.warning
      : colors.error;
  const container = new ContainerBuilder().setAccentColor(accent);
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
  addMenu(container, ids, StatsView.HOME);
  return finish(container);
}

export function buildWeeklyPointsView(ids: StatsCardIds, data: WeeklyPointsPage): BaseMessageOptions {
  const blocks = [C.totalPoints(data.totalPoints), C.weeks.page(data.page, data.pages)];

  if (data.weeks.length === 0) blocks.push(C.weeks.none);
  for (const week of data.weeks) {
    // Every type the member earned in, known or not: types a server doesn't use never show.
    const types = [
      ...POINT_TYPE_ORDER,
      ...Object.keys(week.breakdown).filter((t) => !POINT_TYPE_ORDER.includes(t)),
    ];
    const rows = types.filter((type) => (week.breakdown[type] ?? 0) !== 0).map((type) =>
      S.points.breakdownRow(pointTypeLabel(type), week.breakdown[type] ?? 0),
    );
    blocks.push(
      "",
      C.weeks.week(week.index, week.start, week.end, week.total),
      rows.length ? rows.join("\n") : C.weeks.empty,
    );
  }

  return subView(ids, StatsView.WEEKS, C.weeks.heading(ids.targetId), blocks.join("\n"), [
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

  // Only what this member actually did: a server without jails or vacations never sees those lines.
  const group = (heading: string, rows: [string, number][]): string[] => {
    const shown = rows.filter(([, n]) => n > 0).map(([label, n]) => row(label, n));
    return shown.length ? [heading, ...shown] : [];
  };
  const groups = [
    group(A.staffGroup, [
      [A.staffAccepted, a.staffAccepted],
      [A.staffFired, a.staffFired],
      [A.staffPromoted, a.staffPromoted],
      [A.staffDemoted, a.staffDemoted],
    ]),
    group(A.punishGroup, [
      [A.jails, a.jails],
      [L.userWarningsIssued, a.userWarningsIssued],
      [L.staffWarningsIssued, a.staffWarningsIssued],
      [L.warningsRevoked, a.warningsRevoked],
    ]),
    group(A.otherGroup, [[A.vacationsDecided, a.vacationsDecided]]),
  ].filter((g) => g.length);
  const body = groups.length ? groups.map((g) => g.join("\n")).join("\n\n") : A.none;

  return subView(ids, StatsView.ACTIONS, A.heading(ids.targetId), body);
}

export function buildRecentActivityView(
  ids: StatsCardIds,
  items: readonly RecentActivityItem[],
): BaseMessageOptions {
  const body = items.length
    ? items.map((r) => S.recentRow(rel(r.at), ACTIVITY_LABELS[r.type] ?? r.type)).join("\n")
    : S.recentEmpty;
  return subView(ids, StatsView.RECENT, C.recent.heading(ids.targetId), body);
}

