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
import {
  APPLICATION_TYPE_LABELS,
  DEPARTMENT_LABELS,
  GENDER_LABELS,
} from "../../../data/staff-application/messages.ts";
import { colors } from "../../../data/config/colors.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { ACTIVITY_LABELS, statsMessages as S } from "../../../data/messages/stats.ts";
import { leadMessages } from "../../../data/leads/messages.ts";
import { hiddenStaffMessages } from "../../../data/hidden-staff/messages.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import { ticketConfigService } from "../../tickets/services/ticket-config.service.ts";
import { MENU_VIEWS, StatsView, statsCustomId } from "../handlers/component-ids.ts";
import {
  StaffExitKind,
  type StaffActionStats,
  type StaffCardOverview,
  type WeeklyPointsPage,
} from "../services/staff-card.service.ts";
import type { CardLeads } from "../services/staff-card-leads.service.ts";
import type { RecentActivityItem } from "../services/staff-statistics.service.ts";
import type { TicketStatRow } from "../services/stats-repository.ts";

const C = S.card;
const B = C.buttons;

const POINT_TYPE_ORDER = [
  "TICKET_CLAIM",
  "REPORT_CLAIM",
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
  lines.push(C.acceptedBy(o.acceptedBy));
  if (o.acceptedAt) lines.push(C.acceptedAt(o.acceptedAt));
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

export function leadLines(leads: CardLeads): string[] {
  const R = responsibilityMessages.stats;
  const L = leadMessages.stats;
  const lines = ["", R.heading];
  if (leads.responsibilities.length === 0) lines.push(R.none);
  for (const r of leads.responsibilities) {
    lines.push(R.row(r.title, r.leads.length ? r.leads.join("، ") : null, r.expiresAt));
  }
  if (leads.leadsOf.length) lines.push(L.yourLeads, ...leads.leadsOf.map((l) => L.leadRow(l.name, l.holder)));
  if (leads.leading.length) lines.push(L.leading, ...leads.leading.map((l) => L.leadingRow(l.name, l.target)));
  return lines;
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
    const rows = POINT_TYPE_ORDER.filter((type) => (week.breakdown[type] ?? 0) !== 0).map((type) =>
      S.points.breakdownRow(S.pointTypeLabels[type] ?? type, week.breakdown[type] ?? 0),
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

  return subView(ids, StatsView.ACTIONS, A.heading(ids.targetId), body);
}

export function buildTicketStatsView(ids: StatsCardIds, t: TicketStatRow): BaseMessageOptions {
  const T = C.tickets;
  const panels = Object.entries(t.byPanel).sort((a, b) => b[1].claimed - a[1].claimed);
  const body = [T.totals(t.claimed, t.completed, t.assignedNow)];
  if (panels.length === 0) body.push("", T.empty);
  for (const [panelId, stat] of panels) {
    body.push("", T.panel(ticketConfigService.getPanel(panelId, null)?.name ?? panelId), T.panelRow(stat));
  }
  return subView(ids, StatsView.TICKETS, T.heading(ids.targetId), body.join("\n"));
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

export interface ApplicationViewData {
  type: string;
  applicationStatus: string;
  createdAt?: Date;
  name: string;
  age: number;
  city: string;
  gender?: string | null;
  department?: string | null;
  robticJoinedAt?: Date | null;
  recruiterStaffId?: string | null;
  girlVerification?: string | null;
  girlVerifiedBy?: string | null;
  acceptedBy?: string | null;
  acceptedAt?: Date | null;
  acceptedLevel?: number | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  transfer?: {
    sourceServerName?: string | null;
    sourceServerMemberCount: number;
    sourceServerOnlineCount: number;
    sourceRoleOrder?: number | null;
    sourceRoleName?: string | null;
  } | null;
  evaluation?: { eligible: boolean; proposedStaffLevel?: number | null } | null;
  evidenceCount?: number;
}

/** The member's latest staff application, as they filled it in, plus how it ended. */
export function buildApplicationView(
  ids: StatsCardIds,
  applications: readonly ApplicationViewData[],
): BaseMessageOptions {
  const A = C.application;
  const app = applications[0];
  if (!app) return subView(ids, StatsView.APPLICATION, A.heading(ids.targetId), A.none);

  const lines = [
    applications.length > 1 ? A.more(applications.length) : null,
    A.type(APPLICATION_TYPE_LABELS[app.type] ?? app.type),
    A.status(A.statuses[app.applicationStatus] ?? app.applicationStatus),
    app.createdAt ? A.submittedAt(app.createdAt) : null,
    "",
    A.name(app.name),
    A.age(app.age),
    A.city(app.city),
    app.gender ? A.gender(GENDER_LABELS[app.gender] ?? app.gender) : null,
    app.department ? A.department(DEPARTMENT_LABELS[app.department] ?? app.department) : null,
    app.robticJoinedAt ? A.joinedServer(app.robticJoinedAt) : null,
    app.recruiterStaffId ? A.recruiter(app.recruiterStaffId) : null,
    app.girlVerification === "VERIFIED" ? A.girlVerified(app.girlVerifiedBy ?? null) : null,
    app.girlVerification === "PENDING" ? A.girlPending : null,
    app.acceptedBy ? A.acceptedBy(app.acceptedBy, app.acceptedAt ?? null, app.acceptedLevel ?? null) : null,
    app.rejectedBy ? A.rejectedBy(app.rejectedBy, app.rejectedAt ?? null) : null,
    app.rejectionReason ? A.rejectionReason(app.rejectionReason) : null,
  ];

  if (app.transfer) {
    lines.push(
      "",
      A.transferHeading,
      A.transferServer(
        app.transfer.sourceServerName ?? null,
        app.transfer.sourceServerMemberCount,
        app.transfer.sourceServerOnlineCount,
      ),
      app.transfer.sourceRoleOrder
        ? A.transferRole(app.transfer.sourceRoleOrder, app.transfer.sourceRoleName ?? null)
        : null,
      app.evaluation ? A.transferEligible(app.evaluation.eligible) : null,
      app.evaluation ? A.transferProposed(app.evaluation.proposedStaffLevel ?? null) : null,
      A.transferEvidence(app.evidenceCount ?? 0),
    );
  }

  const body = lines.filter((l): l is string => l !== null).join("\n").slice(0, 3900);
  return subView(ids, StatsView.APPLICATION, A.heading(ids.targetId), body);
}
