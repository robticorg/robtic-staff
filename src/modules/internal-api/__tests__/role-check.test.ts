import { describe, expect, it } from "bun:test";
import { RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";
import type { StaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import { handleRoleCheck, type RoleCheckDeps } from "../role-check.handler.ts";
import { routeInternalRequest } from "../server.ts";

const GUILD = "123456789012345678";
const role = (n: number) => `9000000000000000${String(n).padStart(2, "0")}`;
const IGNORED = "800000000000000001";
const OTHER = "700000000000000001";

const hierarchy: StaffHierarchy = {
  guildId: GUILD,
  levels: Array.from({ length: 12 }, (_, i) => ({ roleId: role(i + 1), level: i, type: RoleConfigType.STAFF })),
  levelByRoleId: new Map(Array.from({ length: 12 }, (_, i) => [role(i + 1), i])),
  ignoredRoleIds: new Set([IGNORED]),
  accessRoleIds: new Set(),
  generalStaffRoleId: null,
  startLevel: 0,
  endLevel: 11,
  boundaryLevels: {
    [StaffTier.STAFF]: 0,
    [StaffTier.HIGHSTAFF]: 3,
    [StaffTier.OWNER]: 7,
    [StaffTier.SHIP]: 10,
  },
  boundaryRoleIds: {
    [StaffTier.STAFF]: role(1),
    [StaffTier.HIGHSTAFF]: role(4),
    [StaffTier.OWNER]: role(8),
    [StaffTier.SHIP]: role(11),
  },
};

const deps: RoleCheckDeps = { hierarchy: async () => hierarchy };

describe("role check", () => {
  it("returns the order and type of a staff role", async () => {
    const res = await handleRoleCheck({ guildId: GUILD, roleId: role(5) }, deps);
    expect(res).toEqual({
      status: 200,
      body: { success: true, roleId: role(5), isStaffRole: true, order: 5, level: 4, type: "high", totalStaffRoles: 12 },
    });
  });

  it("maps every tier", async () => {
    const typeOf = async (n: number) => ((await handleRoleCheck({ guildId: GUILD, roleId: role(n) }, deps)).body as { type: string }).type;
    expect(await typeOf(1)).toBe("staff");
    expect(await typeOf(4)).toBe("high");
    expect(await typeOf(8)).toBe("owner");
    expect(await typeOf(12)).toBe("ship");
  });

  it("says false for roles outside the ladder and ignored roles", async () => {
    for (const roleId of [OTHER, IGNORED]) {
      const res = await handleRoleCheck({ guildId: GUILD, roleId }, deps);
      expect(res.body).toEqual({ success: true, roleId, isStaffRole: false, order: null, level: null, type: null, totalStaffRoles: 12 });
    }
  });

  it("answers many roles at once, in order", async () => {
    const res = await handleRoleCheck({ guildId: GUILD, roleIds: [role(2), OTHER, role(9), role(2)] }, deps);
    expect(res.body).toEqual({
      success: true,
      count: 3,
      staffRoleCount: 2,
      totalStaffRoles: 12,
      results: [
        { roleId: role(2), isStaffRole: true, order: 2, level: 1, type: "staff" },
        { roleId: OTHER, isStaffRole: false, order: null, level: null, type: null },
        { roleId: role(9), isStaffRole: true, order: 9, level: 8, type: "owner" },
      ],
    });
  });

  it("rejects bad or numeric ids", async () => {
    expect((await handleRoleCheck({ guildId: GUILD, roleId: "abc" }, deps)).status).toBe(400);
    expect((await handleRoleCheck({ guildId: GUILD, roleId: 1 }, deps)).status).toBe(400);
    expect((await handleRoleCheck({ guildId: GUILD, roleIds: [] }, deps)).status).toBe(400);
    const bad = await handleRoleCheck({ guildId: GUILD, roleIds: [role(1), 5] }, deps);
    expect(String(bad.body.error)).toContain("roleIds[1]");
  });

  it("is routed for GET and POST behind the token", async () => {
    const url = `http://127.0.0.1/internal/staff/role?guildId=${GUILD}&roleId=abc`;
    expect((await routeInternalRequest(new Request(url), undefined)).status).toBe(400);
    expect((await routeInternalRequest(new Request(url), "token")).status).toBe(401);
    const post = new Request("http://127.0.0.1/internal/staff/role/", {
      method: "POST",
      body: JSON.stringify({ guildId: GUILD, roleIds: ["x"] }),
    });
    expect((await routeInternalRequest(post, undefined)).status).toBe(400);
    expect((await routeInternalRequest(new Request(url, { method: "PUT" }), undefined)).status).toBe(405);
  });
});
