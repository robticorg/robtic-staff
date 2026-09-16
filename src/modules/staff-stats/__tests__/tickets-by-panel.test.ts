import { describe, expect, it } from "bun:test";
import { statsMessages } from "../../../data/messages/stats.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { StatsPeriod } from "../types/enums.ts";
import { buildStatsText } from "../render/stats-text.ts";
import type { StaffStatsResult } from "../services/staff-statistics.service.ts";

function statsWith(
  ticketsByPanel: StaffStatsResult["activity"]["ticketsByPanel"],
): StaffStatsResult {
  return {
    found: true,
    staff: {
      userId: "u1",
      guildId: "g1",
      status: StaffStatus.ACTIVE,
      currentRoleLevel: 1,
      roleId: null,
    },
    period: StatsPeriod.ALL_TIME,
    points: { today: 0, week: 0, month: 0, allTime: 0 },
    pointsInPeriod: 0,
    activity: {
      total: 0,
      byType: {},
      reportsClaimed: 0,
      reportsCompleted: 0,
      reportsAssignedNow: 0,
      ticketsClaimed: 0,
      ticketsCompleted: 0,
      ticketsAssignedNow: 0,
      ticketsByPanel,
      giftClaimsHandled: 0,
      giftClaimsApproved: 0,
      giftClaimsRejected: 0,
      giftClaimsFulfilled: 0,
      giftClaimsReRequested: 0,
      userWarningsIssued: 0,
      staffWarningsIssued: 0,
      warningsRevoked: 0,
      appealsSuccessful: 0,
      appealsHandled: 0,
      vacationsApproved: 0,
      vacationsRejected: 0,
    },
    recentActivity: [],
  };
}

describe("tickets by panel", () => {
  it("renders one row per panel with claimed, completed and open", () => {
    const text = buildStatsText(
      statsWith({ support: { claimed: 12, completed: 10, open: 2 } }),
    );
    expect(text).toContain(statsMessages.ticketsByPanelHeading);
    expect(text).toContain("استلم **12**");
    expect(text).toContain("أكمل **10**");
    expect(text).toContain("مفتوح **2**");
  });

  it("uses the panel's Arabic display name, not its id", () => {
    const text = buildStatsText(
      statsWith({ support: { claimed: 1, completed: 0, open: 1 } }),
    );
    expect(text).toContain("الـدعـم الـفـنـي");
    expect(text).not.toContain("• support —");
  });

  it("falls back to the raw id when the panel is no longer configured", () => {
    const text = buildStatsText(
      statsWith({ "deleted-panel": { claimed: 3, completed: 3, open: 0 } }),
    );
    expect(text).toContain("deleted-panel");
  });

  it("orders panels by how many tickets were claimed", () => {
    const text = buildStatsText(
      statsWith({
        support: { claimed: 1, completed: 1, open: 0 },
        minecraft: { claimed: 9, completed: 9, open: 0 },
      }),
    );
    expect(text.indexOf("دعـم مـايـنكـرافـت")).toBeLessThan(text.indexOf("الـدعـم الـفـنـي"));
  });

  it("shows the empty marker when the staffer handled no tickets", () => {
    const text = buildStatsText(statsWith({}));
    expect(text).toContain(statsMessages.ticketsByPanelEmpty);
  });
});
