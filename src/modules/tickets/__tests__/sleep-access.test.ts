import { describe, expect, it } from "bun:test";
import { decideSleepAccess } from "../services/ticket-permissions.ts";

const base = {
  memberIsAdministrator: false,
  memberIsClaimer: false,
  memberHasPanelSupportRole: false,
};

describe("decideSleepAccess", () => {
  it("lets anyone holding this panel's support role nudge the opener", () => {
    expect(decideSleepAccess({ ...base, memberHasPanelSupportRole: true })).toBe(true);
  });

  it("lets the claimer and an administrator through", () => {
    expect(decideSleepAccess({ ...base, memberIsClaimer: true })).toBe(true);
    expect(decideSleepAccess({ ...base, memberIsAdministrator: true })).toBe(true);
  });

  it("refuses someone with neither the role, the claim, nor admin", () => {
    expect(decideSleepAccess(base)).toBe(false);
  });

  it("is wider than managing: support staff qualify without claiming", () => {
    expect(
      decideSleepAccess({ ...base, memberHasPanelSupportRole: true, memberIsClaimer: false }),
    ).toBe(true);
  });
});
