import { describe, expect, it } from "bun:test";
import { getPanel } from "../../../data/tickets/index.ts";
import { isSetupConfigurable, ticketSetupProblem } from "../panel-config/setup-rules.ts";

const panel = (id: string) => getPanel(id, null)!;

describe("/ticket setup rules", () => {
  it("does not need a support role for the apply and transfer tickets, or staff support", () => {
    for (const id of ["staff-application", "staff-transfer-application", "staff-support"]) {
      expect(ticketSetupProblem(panel(id), { supportRoleId: null, categoryId: "cat" })).toBeNull();
    }
  });

  it("accepts an extra support role for apply and transfer when one is given", () => {
    expect(ticketSetupProblem(panel("staff-application"), { supportRoleId: "role", categoryId: null })).toBeNull();
  });

  it("refuses the other tickets without a support role", () => {
    for (const id of ["support", "minecraft-support", "verified-girls", "responsibility-apply"]) {
      expect(ticketSetupProblem(panel(id), { supportRoleId: null, categoryId: "cat" })).toBe("SUPPORT_REQUIRED");
    }
  });

  it("lets apply and transfer fall back to their /channels category", () => {
    expect(ticketSetupProblem(panel("staff-application"), { supportRoleId: null, categoryId: null })).toBeNull();
    expect(ticketSetupProblem(panel("staff-transfer-application"), { supportRoleId: null, categoryId: null })).toBeNull();
  });

  it("needs a category for tickets that open a channel and have no /channels slot", () => {
    expect(ticketSetupProblem(panel("support"), { supportRoleId: "role", categoryId: null })).toBe("CATEGORY_REQUIRED");
    expect(ticketSetupProblem(panel("staff-support"), { supportRoleId: null, categoryId: null })).toBe("CATEGORY_REQUIRED");
  });

  it("leaves the gift claim out of /ticket setup, it is configured with /channels", () => {
    expect(isSetupConfigurable(panel("gift-claim"))).toBe(false);
    expect(ticketSetupProblem(panel("gift-claim"), { supportRoleId: "role", categoryId: "cat" })).toBe("NOT_CONFIGURABLE");
    expect(isSetupConfigurable(panel("support"))).toBe(true);
  });
});
