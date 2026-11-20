import { describe, expect, it } from "bun:test";
import { listPanels } from "../../../data/tickets/index.ts";
import { heldIgnoredRoles } from "../../staff/services/staff-role-snapshot.ts";
import { intakeService, intakeTarget } from "../services/intake.service.ts";

describe("intake targets", () => {
  const targets = intakeService.targets();

  it("offers every ticket panel, hidden ones included", () => {
    for (const panel of listPanels(null)) {
      expect(intakeService.describe(intakeTarget.panel(panel.id))).not.toBeNull();
    }
    expect(targets).toHaveLength(listPanels(null).length);
  });

  it("fits in one autocomplete list", () => {
    expect(targets.length).toBeLessThanOrEqual(25);
  });
});

describe("heldIgnoredRoles", () => {
  const role = (id: string, position: number) => ({ id, position, managed: false });
  const roles = new Map([
    ["low", role("low", 1)],
    ["high", role("high", 99)],
    ["not-held", role("not-held", 1)],
  ]);
  const member = {
    roles: { cache: new Map([["low", roles.get("low")], ["high", roles.get("high")]]) },
    guild: {
      roles: { cache: roles },
      members: {
        me: { roles: { highest: { comparePositionTo: (r: { position: number }) => 50 - r.position } } },
      },
    },
  };

  it("keeps only held ignored roles the bot can manage", () => {
    expect(heldIgnoredRoles(member as never, ["low", "high", "not-held"])).toEqual(["low"]);
  });
});
