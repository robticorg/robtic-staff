import { describe, expect, it } from "bun:test";
import { getPanel } from "../../../data/tickets/index.ts";
import { isSetupConfigurable, ticketSetupProblem } from "../panel-config/setup-rules.ts";

const panel = (id: string) => getPanel(id, null)!;

describe("/ticket setup rules", () => {
  it("does not need a support role for staff support", () => {
    expect(ticketSetupProblem(panel("staff-support"), { supportRoleId: null, categoryId: "cat" })).toBeNull();
  });

  it("refuses the other tickets without a support role", () => {
    for (const id of ["support", "minecraft-support", "verified-girls", "responsibility-apply"]) {
      expect(ticketSetupProblem(panel(id), { supportRoleId: null, categoryId: "cat" })).toBe("SUPPORT_REQUIRED");
    }
  });

  it("needs a category for tickets that open a channel and have no /channels slot", () => {
    expect(ticketSetupProblem(panel("support"), { supportRoleId: "role", categoryId: null })).toBe("CATEGORY_REQUIRED");
    expect(ticketSetupProblem(panel("staff-support"), { supportRoleId: null, categoryId: null })).toBe("CATEGORY_REQUIRED");
  });

});
