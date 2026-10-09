import { describe, expect, it } from "bun:test";
import { StaffApplicationWorkflow } from "../../../data/staff-application/panels.ts";
import { listPanels } from "../../../data/tickets/index.ts";
import { APPLICATION_DEPARTMENT_VALUES } from "../../applications/shared/enums.ts";
import { heldIgnoredRoles } from "../../staff/services/staff-role-snapshot.ts";
import { intakeService, intakeTarget } from "../services/intake.service.ts";

describe("intake targets", () => {
  const targets = intakeService.targets();

  it("offers every ticket panel, hidden ones included, plus each department", () => {
    for (const panel of listPanels(null)) {
      expect(intakeService.describe(intakeTarget.panel(panel.id))).not.toBeNull();
    }
    for (const dept of APPLICATION_DEPARTMENT_VALUES) {
      expect(intakeService.describe(intakeTarget.department(dept))?.group).toBe("APPLICATION");
    }
    expect(targets).toHaveLength(listPanels(null).length + APPLICATION_DEPARTMENT_VALUES.length);
  });

  it("groups the application and transfer panels under applications", () => {
    for (const id of [
      StaffApplicationWorkflow.STAFF_APPLICATION,
      StaffApplicationWorkflow.STAFF_TRANSFER_APPLICATION,
    ]) {
      expect(intakeService.describe(intakeTarget.panel(id))?.group).toBe("APPLICATION");
    }
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
