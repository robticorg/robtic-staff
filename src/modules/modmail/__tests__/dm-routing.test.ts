import { describe, expect, it } from "bun:test";
import { routeDm } from "../flow/dm-routing.ts";

describe("routeDm", () => {
  it("prioritises an in-progress wizard draft", () => {
    expect(routeDm({ hasDraft: true, openCaseIds: ["RPT-1"] })).toEqual({ kind: "WIZARD" });
  });

  it("shows the menu when there is nothing active", () => {
    expect(routeDm({ hasDraft: false, openCaseIds: [] })).toEqual({ kind: "MENU" });
  });

  it("relays straight through when exactly one case is open", () => {
    expect(routeDm({ hasDraft: false, openCaseIds: ["RPT-9"] })).toEqual({
      kind: "RELAY",
      caseId: "RPT-9",
    });
  });

  it("relays to the selected active case when several are open", () => {
    expect(
      routeDm({ hasDraft: false, activeCaseId: "RPT-2", openCaseIds: ["RPT-1", "RPT-2"] }),
    ).toEqual({ kind: "RELAY", caseId: "RPT-2" });
  });

  it("asks the user to choose when several are open and none selected", () => {
    expect(routeDm({ hasDraft: false, openCaseIds: ["RPT-1", "RPT-2"] })).toEqual({
      kind: "CHOOSE_CASE",
      caseIds: ["RPT-1", "RPT-2"],
    });
  });

  it("never relays to a closed case (it is absent from openCaseIds)", () => {
    expect(routeDm({ hasDraft: false, activeCaseId: "RPT-1", openCaseIds: [] })).toEqual({
      kind: "MENU",
    });
  });

  it("drops a stale activeCaseId that is no longer open", () => {
    expect(
      routeDm({ hasDraft: false, activeCaseId: "RPT-1", openCaseIds: ["RPT-7"] }),
    ).toEqual({ kind: "RELAY", caseId: "RPT-7" });
  });
});
