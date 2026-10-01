import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_POINT_VALUES } from "../config/points.ts";
import { StaffPointTransactionType as T } from "../types/enums.ts";

const src = (path: string) => readFileSync(join(import.meta.dir, "../../..", path), "utf8");

describe("point values", () => {
  it("pays what the staff team decided", () => {
    expect(DEFAULT_POINT_VALUES[T.TICKET_CLAIM]).toBe(2);
    expect(DEFAULT_POINT_VALUES[T.USER_WARNING]).toBe(2);
    expect(DEFAULT_POINT_VALUES[T.JAIL]).toBe(1);
    expect(DEFAULT_POINT_VALUES[T.STAFF_ACCEPT]).toBe(1);
    expect(DEFAULT_POINT_VALUES[T.STAFF_WARNING]).toBe(1);
    expect(DEFAULT_POINT_VALUES[T.REPORT_CLAIM]).toBe(1);
  });

  it("reads every automatic award from the config instead of a typed-in number", () => {
    for (const file of [
      "modules/tickets/services/ticket-claim-credit.ts",
      "modules/modmail/services/claim-credit.ts",
      "modules/warnings/services/warning-actions.service.ts",
    ]) {
      expect(src(file)).not.toMatch(/amount:\s*\d/);
      expect(src(file)).toContain("DEFAULT_POINT_VALUES");
    }
  });

  it("awards jail and accept points to whoever did it, once per thing", () => {
    const jail = src("modules/punishment/services/moderation-action.service.ts");
    expect(jail).toContain("StaffPointTransactionType.JAIL");
    expect(jail).toContain("referenceId: result.punishment.punishmentId");

    const accept = src("modules/staff/services/staff-management.service.ts");
    expect(accept).toContain("StaffPointTransactionType.STAFF_ACCEPT");
    expect(accept).toContain("referenceId: `accept:${member.id}`");
  });
});
