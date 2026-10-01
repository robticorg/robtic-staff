import { describe, expect, it } from "bun:test";
import { StaffTier } from "../../configuration/types/enums.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { routeInternalRequest } from "../server.ts";
import { handleStaffCheck, type StaffCheckDeps, type StaffCheckRecord } from "../staff-check.handler.ts";

const GUILD = "123456789012345678";
const USER = "223456789012345678";
const A = "323456789012345678";
const B = "423456789012345678";
const C = "523456789012345678";

const LEVEL_TIERS: Record<number, StaffTier> = {
  1: StaffTier.STAFF,
  2: StaffTier.HIGHSTAFF,
  3: StaffTier.OWNER,
  4: StaffTier.SHIP,
};

const deps = (records: StaffCheckRecord[]): StaffCheckDeps => ({
  findStaff: async (_guild, ids) => records.filter((r) => ids.includes(r.userId)),
  tierResolver: async () => (level) => LEVEL_TIERS[level] ?? StaffTier.STAFF,
});

const one = (status: string | null, level = 1) => deps(status ? [{ userId: USER, status, currentRoleLevel: level }] : []);

describe("staff check — single user", () => {
  it("answers false for non-staff and former staff", async () => {
    for (const status of [null, StaffStatus.FIRED, StaffStatus.BLACKLISTED]) {
      const res = await handleStaffCheck({ guildId: GUILD, userId: USER }, one(status));
      expect(res).toEqual({ status: 200, body: { success: true, userId: USER, isStaff: false, type: null } });
    }
  });

  it("answers true with the type for every tier", async () => {
    const expected = ["staff", "high", "owner", "ship"];
    for (const [i, type] of expected.entries()) {
      const res = await handleStaffCheck({ guildId: GUILD, userId: USER }, one(StaffStatus.ACTIVE, i + 1));
      expect(res.body).toEqual({ success: true, userId: USER, isStaff: true, type, onBreak: false });
    }
  });

  it("still counts staff on break", async () => {
    const res = await handleStaffCheck({ guildId: GUILD, userId: USER }, one(StaffStatus.BREAK, 3));
    expect(res.body).toMatchObject({ isStaff: true, type: "owner", onBreak: true });
  });

  it("rejects bad or numeric ids", async () => {
    expect((await handleStaffCheck({ guildId: GUILD, userId: "abc" }, one(null))).status).toBe(400);
    expect((await handleStaffCheck({ guildId: 123, userId: USER }, one(null))).status).toBe(400);
    expect((await handleStaffCheck({}, one(null))).status).toBe(400);
  });
});

describe("staff check — many users", () => {
  const records: StaffCheckRecord[] = [
    { userId: A, status: StaffStatus.ACTIVE, currentRoleLevel: 2 },
    { userId: B, status: StaffStatus.FIRED, currentRoleLevel: 4 },
    { userId: USER, status: StaffStatus.BREAK, currentRoleLevel: 4 },
  ];

  it("answers each id in order, with its type", async () => {
    const res = await handleStaffCheck({ guildId: GUILD, userIds: [A, B, C, USER, A] }, deps(records));
    expect(res).toEqual({
      status: 200,
      body: {
        success: true,
        count: 4,
        staffCount: 2,
        results: [
          { userId: A, isStaff: true, type: "high", onBreak: false },
          { userId: B, isStaff: false, type: null },
          { userId: C, isStaff: false, type: null },
          { userId: USER, isStaff: true, type: "ship", onBreak: true },
        ],
      },
    });
  });

  it("rejects empty, oversized and invalid lists", async () => {
    const check = (userIds: unknown) => handleStaffCheck({ guildId: GUILD, userIds }, deps(records));
    expect((await check([])).status).toBe(400);
    expect((await check("abc")).status).toBe(400);
    expect((await check(Array.from({ length: 101 }, () => A))).status).toBe(400);
    const bad = await check([A, 123]);
    expect(bad.status).toBe(400);
    expect(String(bad.body.error)).toContain("userIds[1]");
  });
});

describe("staff check — routing", () => {
  it("is routed for GET and POST, behind the token", async () => {
    const url = `http://127.0.0.1/internal/staff/check?guildId=${GUILD}&userId=abc`;
    expect((await routeInternalRequest(new Request(url), undefined)).status).toBe(400);
    expect((await routeInternalRequest(new Request(url), "token")).status).toBe(401);
    const post = new Request("http://127.0.0.1/internal/staff/check/", {
      method: "POST",
      body: JSON.stringify({ guildId: GUILD, userIds: [A, 1] }),
    });
    expect((await routeInternalRequest(post, undefined)).status).toBe(400);
    expect((await routeInternalRequest(new Request(url, { method: "DELETE" }), undefined)).status).toBe(405);
  });

  it("reads comma-separated userIds from the query", async () => {
    const res = await routeInternalRequest(
      new Request(`http://127.0.0.1/internal/staff/check?guildId=${GUILD}&userIds=${A},bad`),
      undefined,
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain("userIds[1]");
  });
});
