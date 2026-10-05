import { describe, expect, it } from "bun:test";
import { clearPanelOverrides, setPanelOverride } from "../../../data/tickets/index.ts";
import {
  UNSET_ID,
  isUnsetId,
  panelCreatesChannel,
  panelIsAdminOnly,
  getPanel,
  listPanels,
  type TicketClaimerConfig,
} from "../../../data/tickets/index.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../../data/gift-claim/config.ts";
import { TicketStatus } from "../types/enums.ts";
import {
  decideClaimEligibility,
  decideManageAccess,
  protectedTicketPrincipals,
} from "../services/ticket-permissions.ts";

const claimer: TicketClaimerConfig = {
  supportRoleCanClaim: true,
  managersCanClaim: true,
  onlyOnce: true,
  transferable: false,
};

describe("unset-id helpers", () => {
  it("treats the placeholder, empty and missing ids as unset", () => {
    expect(isUnsetId(UNSET_ID)).toBe(true);
    expect(isUnsetId("")).toBe(true);
    expect(isUnsetId(undefined)).toBe(true);
    expect(isUnsetId("1545812169525035132")).toBe(false);
  });

  it("marks a panel administrator-only exactly when the support role is unset", () => {
    expect(panelIsAdminOnly({ supportRoleId: UNSET_ID })).toBe(true);
    expect(panelIsAdminOnly({ supportRoleId: "" })).toBe(true);
    expect(panelIsAdminOnly({ supportRoleId: "123" })).toBe(false);
  });
});

describe("administrator-only panel (no support role configured)", () => {
  const base = {
    memberHasSupportRole: false,
    memberIsManager: false,
    memberIsAdministrator: false,
    memberIsOwner: false,
    claimer,
    ticketStatus: TicketStatus.OPEN,
    alreadyClaimed: false,
    panelIsAdminOnly: true,
  };

  it("lets an administrator claim", () => {
    expect(decideClaimEligibility({ ...base, memberIsAdministrator: true })).toEqual({ ok: true });
  });

  it("blocks a ticket manager", () => {
    expect(decideClaimEligibility({ ...base, memberIsManager: true }).ok).toBe(false);
  });

  it("blocks an ordinary member", () => {
    expect(decideClaimEligibility(base).ok).toBe(false);
  });

  it("blocks someone who happens to hold the placeholder role", () => {
    expect(decideClaimEligibility({ ...base, memberHasSupportRole: true }).ok).toBe(false);
  });

  it("management is admin-or-claimer regardless of panel type", () => {
    const m = { memberIsAdministrator: false, memberIsClaimer: false };
    expect(decideManageAccess({ ...m, memberIsAdministrator: true })).toBe(true);
    expect(decideManageAccess({ ...m, memberIsClaimer: true })).toBe(true);
    expect(decideManageAccess(m)).toBe(false);
  });

  it("does not protect the placeholder id as a principal", () => {
    const set = protectedTicketPrincipals(
      { userId: "owner", claimedByDiscordId: "claimer" },
      { supportRoleId: UNSET_ID },
    );
    expect([...set].sort()).toEqual(["claimer", "owner"]);
    expect(set.has(UNSET_ID)).toBe(false);
  });
});

describe("configured panel is unaffected", () => {
  const base = {
    memberHasSupportRole: true,
    memberIsManager: false,
    memberIsAdministrator: false,
    memberIsOwner: false,
    claimer,
    ticketStatus: TicketStatus.OPEN,
    alreadyClaimed: false,
  };

  it("still lets the support role claim", () => {
    expect(decideClaimEligibility(base)).toEqual({ ok: true });
  });

  it("never lets a ticket manager claim, even with the support role", () => {
    expect(decideClaimEligibility({ ...base, memberHasSupportRole: false, memberIsManager: true }))
      .toEqual({ ok: false, reason: "IS_MANAGER" });
    expect(decideClaimEligibility({ ...base, memberHasSupportRole: true, memberIsManager: true }))
      .toEqual({ ok: false, reason: "IS_MANAGER" });
  });

  it("still lets an administrator claim", () => {
    expect(decideClaimEligibility({ ...base, memberIsManager: true, memberIsAdministrator: true }).ok).toBe(true);
  });
});

describe("gift-claim panel needs no category", () => {
  it("is declared as not opening a ticket channel", () => {
    const panel = getPanel(GIFT_CLAIM_PANEL_ID);
    expect(panel).toBeDefined();
    expect(panelCreatesChannel(panel!)).toBe(false);
  });

  it("carries no category or per-panel log channel", () => {
    const panel = getPanel(GIFT_CLAIM_PANEL_ID)!;
    expect(panel.categoryId).toBeUndefined();
    expect(panel.logChannelId).toBeUndefined();
  });

  it("takes its support role from /ticket setup, which grants gift-manager rights", () => {
    expect(panelIsAdminOnly(getPanel(GIFT_CLAIM_PANEL_ID)!)).toBe(true);
    setPanelOverride(GIFT_CLAIM_PANEL_ID, { supportRoleId: "gift-support" });
    try {
      expect(panelIsAdminOnly(getPanel(GIFT_CLAIM_PANEL_ID)!)).toBe(false);
    } finally {
      clearPanelOverrides();
    }
  });

  it("keeps no hardcoded roles, categories or log channels in any panel", () => {
    for (const panel of listPanels()) {
      expect(isUnsetId(panel.supportRoleId)).toBe(true);
      expect(panel.categoryId).toBeUndefined();
      expect(panel.logChannelId).toBeUndefined();
    }
  });
});
