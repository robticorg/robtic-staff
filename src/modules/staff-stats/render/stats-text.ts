import { ACTIVITY_LABELS, statsMessages as S } from "../../../data/messages/stats.ts";
import { STATS_PERIOD_LABEL } from "../types/enums.ts";
import type { StaffStatsResult } from "../services/staff-statistics.service.ts";

function rel(at: Date): string {
  return `<t:${Math.floor(at.getTime() / 1000)}:R>`;
}

export function buildStatsText(stats: StaffStatsResult): string {
  if (!stats.found || !stats.staff) return S.noStaffRecord(S.labels.memberFallback);
  const a = stats.activity;
  const L = S.labels;
  const periodLabel = STATS_PERIOD_LABEL[stats.period];
  const out: string[] = [
    S.header,
    S.divider,
    "",
    S.memberLine(stats.staff.userId),
    S.roleLine(stats.staff.roleId, stats.staff.currentRoleLevel),
    S.statusLine(stats.staff.status),
    "",
    S.pointsHeading,
    S.pointRow(L.today, stats.points.today),
    S.pointRow(L.week, stats.points.week),
    S.pointRow(L.month, stats.points.month),
    S.pointRow(L.allTime, stats.points.allTime),
    "",
    S.activityHeading(periodLabel),
    S.activityRow(L.reportsClaimed, a.reportsClaimed),
    S.activityRow(L.reportsCompleted, a.reportsCompleted),
    S.activityRow(L.reportsAssignedNow, a.reportsAssignedNow),
    S.activityRow(L.ticketsClaimed, a.ticketsClaimed),
    S.activityRow(L.ticketsCompleted, a.ticketsCompleted),
    S.activityRow(L.ticketsAssignedNow, a.ticketsAssignedNow),
    S.ticketsByPanel(Object.entries(a.ticketsByPanel)),
    S.activityRow(L.giftClaimsHandled, a.giftClaimsHandled),
    S.activityRow(
      L.giftClaimsBreakdown,
      `${a.giftClaimsApproved} / ${a.giftClaimsRejected} / ${a.giftClaimsFulfilled} / ${a.giftClaimsReRequested}`,
    ),
    S.activityRow(L.userWarningsIssued, a.userWarningsIssued),
    S.activityRow(L.staffWarningsIssued, a.staffWarningsIssued),
    S.activityRow(L.warningsRevoked, a.warningsRevoked),
    S.activityRow(L.appealsHandled, a.appealsHandled),
    S.activityRow(L.appealsSuccessful, a.appealsSuccessful),
    S.activityRow(
      L.vacationsDecided,
      `${a.vacationsApproved} / ${a.vacationsRejected}`,
    ),
    S.activityRow(L.totalActivity, a.total),
    "",
    S.recentHeading,
    ...(stats.recentActivity.length
      ? stats.recentActivity.map((r) =>
          S.recentRow(rel(r.at), ACTIVITY_LABELS[r.type] ?? r.type),
        )
      : [S.recentEmpty]),
  ];

  if (stats.pointHistory) {
    out.push("", S.historyHeading);
    if (stats.pointHistory.length === 0) out.push(S.recentEmpty);
    for (const t of stats.pointHistory) {
      out.push(S.historyRow(rel(t.at), t.amount, t.type, t.referenceId ?? ""));
    }
  }

  return out.join("\n").slice(0, 1950);
}
