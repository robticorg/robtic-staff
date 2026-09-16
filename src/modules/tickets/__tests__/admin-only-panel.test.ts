import { describe, expect, it } from "bun:test";
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
    // Defence in depth: even if a stray overwrite existed, admin-only wins.
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

  it("still lets a manager claim", () => {
    expect(decideClaimEligibility({ ...base, memberHasSupportRole: false, memberIsManager: true }))
      .toEqual({ ok: true });
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

  it("keeps its support role, which still grants gift-manager rights", () => {
    expect(panelIsAdminOnly(getPanel(GIFT_CLAIM_PANEL_ID)!)).toBe(false);
  });

  it("leaves every channel-opening panel with a category", () => {
    for (const panel of listPanels()) {
      if (!panelCreatesChannel(panel)) continue;
      expect(panel.categoryId).toBeDefined();
      expect(isUnsetId(panel.categoryId)).toBe(false);
    }
  });
});
