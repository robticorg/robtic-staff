import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";
import { invalidateStaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import {
  DenyReason,
  ManagementAuthority,
  staffManagementAuthorizationService as auth,
} from "../services/staff-management-authorization.service.ts";

let hasDb = false;
try {
  await mongoose.connect(config.mongoUri, {
    dbName: `${config.mongoDbName}_test`,
    serverSelectionTimeoutMS: 1500,
  });
  hasDb = true;
} catch {
  hasDb = false;
}

const GUILD = "auth-itest-guild";
const OTHER_GUILD = "auth-itest-other";

const R_STAFF_MARKER = "r-staff-marker";
const R_STAFF_MANAGER = "r-staff-manager";
const R_OWNER_MANAGER = "r-owner-manager";
const R_APPLY_MANAGER = "r-apply-manager";
const R_IGNORE = "r-ignore";
const R_BLACKLIST = "r-blacklist";

/** level → roleId for the numbered ladder (0..12). */
const rung = (level: number) => `r-lvl-${level}`;
const HIGHSTAFF_LEVEL = 4;
const OWNER_LEVEL = 7;
const SHIP_LEVEL = 10;
const END_LEVEL = 12;

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

/**
 * The Staff Manager role is deliberately given a Discord position *above* most
 * numbered roles by sitting late in the cache — nothing in the authorization
 * path may read position, so it must make no difference.
 */
function member(id: string, roleIds: string[], administrator = false, guildId = GUILD) {
  const cache = new RoleCache();
  for (const r of roleIds) cache.set(r, { id: r });
  return {
    id,
    guild: { id: guildId },
    permissions: { has: () => administrator },
    roles: { cache },
  } as never;
}

const staffManagerAt = (level: number, id = "sm") =>
  member(id, [R_STAFF_MARKER, R_STAFF_MANAGER, rung(level)]);
const ownerManagerAt = (level: number, id = "om") =>
  member(id, [R_STAFF_MARKER, R_OWNER_MANAGER, rung(level)]);
const applyManagerAt = (level: number, id = "am") =>
  member(id, [R_STAFF_MARKER, R_APPLY_MANAGER, rung(level)]);
const administrator = (id = "admin") => member(id, [R_STAFF_MARKER], true);
const plainStaff = (level: number, id = "plain") =>
  member(id, [R_STAFF_MARKER, rung(level)]);

async function seed(guildId = GUILD, opts: { ship?: boolean; owner?: boolean } = {}): Promise<void> {
  const { ship = true, owner = true } = opts;
  await RoleConfigModel.deleteMany({ guildId });

  const docs: Record<string, unknown>[] = [
    { guildId, roleId: R_STAFF_MARKER, type: RoleConfigType.STAFF },
    { guildId, roleId: R_STAFF_MANAGER, type: RoleConfigType.STAFF_MANAGER },
    { guildId, roleId: R_OWNER_MANAGER, type: RoleConfigType.OWNER_MANAGER },
    { guildId, roleId: R_APPLY_MANAGER, type: RoleConfigType.APPLY_MANAGER },
    { guildId, roleId: R_IGNORE, type: RoleConfigType.IGNORE },
    { guildId, roleId: R_BLACKLIST, type: RoleConfigType.BLACKLIST },
  ];
  for (let level = 0; level <= END_LEVEL; level += 1) {
    const type =
      level === 0
        ? RoleConfigType.START
        : level === END_LEVEL
          ? RoleConfigType.END
          : RoleConfigType.STAFF;
    const boundary =
      level === HIGHSTAFF_LEVEL
        ? StaffTier.HIGHSTAFF
        : level === OWNER_LEVEL && owner
          ? StaffTier.OWNER
          : level === SHIP_LEVEL && ship
            ? StaffTier.SHIP
            : undefined;
    docs.push({ guildId, roleId: rung(level), type, level, ...(boundary ? { boundary } : {}) });
  }
  await RoleConfigModel.create(docs);
  invalidateStaffHierarchy(guildId);
}

describe.skipIf(!hasDb)("Staff management authorization", () => {
  beforeEach(async () => {
    await seed();
  });

  afterAll(async () => {
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await RoleConfigModel.deleteMany({ guildId: OTHER_GUILD });
  });

  // ── Authority resolution (§1, §6) ─────────────────────────────────────────

  it("resolves authority from configured roles, never Discord position", async () => {
    expect((await auth.getAuthority(administrator())).kind).toBe(
      ManagementAuthority.ADMINISTRATOR,
    );
    expect((await auth.getAuthority(ownerManagerAt(5))).kind).toBe(
      ManagementAuthority.OWNER_MANAGER,
    );
    expect((await auth.getAuthority(staffManagerAt(5))).kind).toBe(
      ManagementAuthority.STAFF_MANAGER,
    );
    expect((await auth.getAuthority(plainStaff(9))).kind).toBe(ManagementAuthority.NONE);
  });

  it("caps a Staff Manager at min(own level, last level before Ship) (§6)", async () => {
    expect(await auth.getPromotionLimit(staffManagerAt(5))).toBe(5);
    // Own level is above Ship, so the Ship boundary still caps them.
    expect(await auth.getPromotionLimit(staffManagerAt(11))).toBe(SHIP_LEVEL - 1);
  });

  it("caps an Owner Manager at the last level before Ship (§4)", async () => {
    expect(await auth.getPromotionLimit(ownerManagerAt(2))).toBe(SHIP_LEVEL - 1);
  });

  it("leaves an Administrator uncapped (§5)", async () => {
    expect(await auth.getPromotionLimit(administrator())).toBeNull();
  });

  it("gives a Staff Manager sitting above numbered roles no extra power (§1)", async () => {
    // Same manager, one holding many high numbered roles in its cache.
    const positioned = member("sm-high", [
      R_STAFF_MARKER,
      R_STAFF_MANAGER,
      rung(5),
      R_IGNORE,
      R_BLACKLIST,
    ]);
    expect(await auth.getPromotionLimit(positioned)).toBe(5);
  });

  // ── Promotion (§3, §12, §15, §16, §17) ────────────────────────────────────

  it("lets a Staff Manager promote inside their range (§3)", async () => {
    const sm = staffManagerAt(5);
    expect((await auth.canPromote(sm, plainStaff(0, "t"), 1, 0)).allowed).toBe(true);
    expect((await auth.canPromote(sm, plainStaff(4, "t"), 5, 4)).allowed).toBe(true);
  });

  it("stops a Staff Manager promoting above their own level (§3, §16)", async () => {
    const sm = staffManagerAt(5);
    const decision = await auth.canPromote(sm, plainStaff(5, "t"), 6, 5);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.LEVEL_ABOVE_ACTOR);
  });

  it("stops a Staff Manager touching a target already above them (§16)", async () => {
    const decision = await auth.canPromote(staffManagerAt(5), plainStaff(7, "t"), 8, 7);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.TARGET_ABOVE_ACTOR);
  });

  it("stops a Staff Manager promoting themselves (§15)", async () => {
    const sm = staffManagerAt(5, "same");
    const decision = await auth.canPromote(sm, sm, 4, 3);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.SELF_PROMOTE);
  });

  it("stops an Owner Manager promoting themselves (§4)", async () => {
    const om = ownerManagerAt(5, "same");
    expect((await auth.canPromote(om, om, 6, 5)).allowed).toBe(false);
  });

  it("lets an Owner Manager reach the last level before Ship (§13)", async () => {
    const om = ownerManagerAt(2);
    expect((await auth.canPromote(om, plainStaff(7, "t"), 9, 7)).allowed).toBe(true);
  });

  it("stops an Owner Manager promoting into Ship (§13, §17)", async () => {
    const decision = await auth.canPromote(ownerManagerAt(2), plainStaff(9, "t"), 10, 9);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.LEVEL_IN_SHIP);
  });

  it("stops a Staff Manager promoting into Ship even at a high own level (§17)", async () => {
    const decision = await auth.canPromote(staffManagerAt(11), plainStaff(9, "t"), 10, 9);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.LEVEL_IN_SHIP);
  });

  it("lets an Administrator promote anyone anywhere, including Ship (§14)", async () => {
    const admin = administrator();
    expect((await auth.canPromote(admin, plainStaff(3, "t"), 13, 3)).allowed).toBe(true);
    expect((await auth.canPromote(admin, plainStaff(3, "t"), SHIP_LEVEL, 3)).allowed).toBe(true);
    expect((await auth.canPromote(admin, plainStaff(11, "t"), END_LEVEL, 11)).allowed).toBe(true);
  });

  it("lets an Administrator promote themselves (§5)", async () => {
    const admin = administrator("self-admin");
    expect((await auth.canPromote(admin, admin, 9, 3)).allowed).toBe(true);
  });

  it("refuses anyone without a management role (§6)", async () => {
    const decision = await auth.canPromote(plainStaff(9), plainStaff(0, "t"), 1, 0);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.NOT_A_MANAGER);
  });

  it("refuses a Staff Manager with no numbered staff role", async () => {
    const bare = member("sm-bare", [R_STAFF_MARKER, R_STAFF_MANAGER]);
    const decision = await auth.canPromote(bare, plainStaff(0, "t"), 1, 0);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.ACTOR_NOT_STAFF);
  });

  // ── Demotion (§19 + demotion spec) ────────────────────────────────────────

  it("stops a Staff Manager demoting themselves", async () => {
    const sm = staffManagerAt(5, "same");
    const decision = await auth.canDemote(sm, sm, 4, 5);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.SELF_DEMOTE);
  });

  it("stops an Owner Manager demoting themselves", async () => {
    const om = ownerManagerAt(5, "same");
    expect((await auth.canDemote(om, om, 4, 5)).allowed).toBe(false);
  });

  it("stops a Staff Manager demoting anyone in the Owner tier", async () => {
    const decision = await auth.canDemote(staffManagerAt(9), plainStaff(7, "t"), 6, 7);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.TARGET_IN_OWNER);
  });

  it("stops a Staff Manager demoting higher-level staff", async () => {
    const decision = await auth.canDemote(staffManagerAt(3), plainStaff(5, "t"), 4, 5);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.TARGET_ABOVE_ACTOR_DEMOTE);
  });

  it("lets a Staff Manager demote within their range", async () => {
    expect((await auth.canDemote(staffManagerAt(5), plainStaff(5, "t"), 4, 5)).allowed).toBe(true);
  });

  it("stops an Owner Manager demoting Ship staff", async () => {
    const decision = await auth.canDemote(ownerManagerAt(5), plainStaff(11, "t"), 10, 11);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.TARGET_IN_SHIP);
  });

  it("lets an Owner Manager demote inside the Owner tier", async () => {
    expect((await auth.canDemote(ownerManagerAt(5), plainStaff(9, "t"), 7, 9)).allowed).toBe(true);
  });

  it("lets an Administrator demote through Ship", async () => {
    expect(
      (await auth.canDemote(administrator(), plainStaff(11, "t"), 2, 11)).allowed,
    ).toBe(true);
  });

  it("refuses a demotion that would fall below level 0", async () => {
    const decision = await auth.canDemote(staffManagerAt(5), plainStaff(0, "t"), -1, 0);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.BELOW_MIN_LEVEL);
  });

  it("refuses demotion for a non-manager with its own message", async () => {
    const decision = await auth.canDemote(plainStaff(9), plainStaff(0, "t"), -1, 0);
    expect((decision as { reason: string }).reason).toBe(DenyReason.NOT_A_MANAGER_DEMOTE);
  });

  // ── Accept (§20) ──────────────────────────────────────────────────────────

  it("lets an Administrator accept at any level, including Ship", async () => {
    expect(
      (await auth.canAccept(administrator(), plainStaff(0, "t"), SHIP_LEVEL)).allowed,
    ).toBe(true);
  });

  it("blocks a Staff Manager or Owner Manager from accepting — Apply Manager only", async () => {
    const smDecision = await auth.canAccept(staffManagerAt(11), plainStaff(0, "t"), 0);
    expect(smDecision.allowed).toBe(false);
    expect((smDecision as { reason: DenyReason }).reason).toBe(DenyReason.NOT_A_MANAGER);

    expect((await auth.canAccept(ownerManagerAt(5), plainStaff(0, "t"), 0)).allowed).toBe(false);
  });

  it("blocks an Apply Manager from accepting at or above their own tier", async () => {
    const om = applyManagerAt(OWNER_LEVEL);
    const atOwn = await auth.canAccept(om, plainStaff(0, "t"), OWNER_LEVEL);
    expect(atOwn.allowed).toBe(false);
    expect((atOwn as { reason: DenyReason }).reason).toBe(DenyReason.LEVEL_ABOVE_AUTHORITY);

    expect((await auth.canAccept(om, plainStaff(0, "t"), OWNER_LEVEL + 1)).allowed).toBe(false);
    expect((await auth.canAccept(om, plainStaff(0, "t"), SHIP_LEVEL)).allowed).toBe(false);
  });

  it("lets an Apply Manager accept strictly below their own tier", async () => {
    const om = applyManagerAt(OWNER_LEVEL);
    expect((await auth.canAccept(om, plainStaff(0, "t"), OWNER_LEVEL - 1)).allowed).toBe(true);
    expect((await auth.canAccept(om, plainStaff(0, "t"), HIGHSTAFF_LEVEL)).allowed).toBe(true);

    const hs = applyManagerAt(HIGHSTAFF_LEVEL, "am-hs");
    expect((await auth.canAccept(hs, plainStaff(0, "t"), HIGHSTAFF_LEVEL)).allowed).toBe(false);
    expect((await auth.canAccept(hs, plainStaff(0, "t"), HIGHSTAFF_LEVEL - 1)).allowed).toBe(true);
  });

  it("blocks an Apply Manager from accepting themselves", async () => {
    const om = applyManagerAt(OWNER_LEVEL, "self-am");
    expect((await auth.canAccept(om, om, 0)).allowed).toBe(false);
  });

  // ── Fire (§21) ────────────────────────────────────────────────────────────

  it("blocks a Staff Manager from firing anyone at all, regardless of level", async () => {
    const decision = await auth.canFire(staffManagerAt(5), plainStaff(4, "t"), 4);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: DenyReason }).reason).toBe(DenyReason.NOT_A_MANAGER);
  });

  it("lets an Owner Manager fire someone below the Owner tier", async () => {
    expect((await auth.canFire(ownerManagerAt(5), plainStaff(4, "t"), 4)).allowed).toBe(true);
    expect((await auth.canFire(ownerManagerAt(5), plainStaff(HIGHSTAFF_LEVEL, "t"), HIGHSTAFF_LEVEL)).allowed).toBe(true);
  });

  it("blocks an Owner Manager from firing an Owner or Ship member — only an administrator can", async () => {
    const atOwner = await auth.canFire(ownerManagerAt(5), plainStaff(OWNER_LEVEL, "t"), OWNER_LEVEL);
    expect(atOwner.allowed).toBe(false);
    expect((atOwner as { reason: DenyReason }).reason).toBe(DenyReason.TARGET_IN_OWNER);

    expect((await auth.canFire(ownerManagerAt(5), plainStaff(SHIP_LEVEL, "t"), SHIP_LEVEL)).allowed).toBe(false);
    expect((await auth.canFire(administrator(), plainStaff(SHIP_LEVEL, "t"), SHIP_LEVEL)).allowed).toBe(true);
    expect((await auth.canFire(administrator(), plainStaff(OWNER_LEVEL, "t"), OWNER_LEVEL)).allowed).toBe(true);
  });

  // ── Configuration edge cases (§21–§25 of the test list) ───────────────────

  it("treats management and ignored roles as consuming no level (§10, §14, §15)", async () => {
    const withNoise = member("sm-noise", [
      R_STAFF_MARKER,
      R_STAFF_MANAGER,
      R_OWNER_MANAGER,
      R_IGNORE,
      R_BLACKLIST,
      rung(3),
    ]);
    // Level comes solely from the numbered rung.
    expect((await auth.getAuthority(withNoise)).actorLevel).toBe(3);
  });

  it("falls back to the END level when no Ship boundary is configured (§24)", async () => {
    await seed(GUILD, { ship: false });
    expect(await auth.getPromotionLimit(ownerManagerAt(2))).toBe(END_LEVEL);
    // Without a Ship tier nothing can be "in Ship", so the top is reachable.
    expect(
      (await auth.canPromote(ownerManagerAt(2), plainStaff(9, "t"), END_LEVEL, 9)).allowed,
    ).toBe(true);
  });

  it("denies everything while the hierarchy is invalid (§21 of the list)", async () => {
    await RoleConfigModel.deleteOne({ guildId: GUILD, roleId: rung(END_LEVEL) });
    invalidateStaffHierarchy(GUILD);

    const decision = await auth.canPromote(staffManagerAt(5), plainStaff(0, "t"), 1, 0);
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toBe(DenyReason.HIERARCHY_INVALID);
  });

  it("treats a deleted management role as loss of authority (§23)", async () => {
    await RoleConfigModel.deleteOne({ guildId: GUILD, roleId: R_STAFF_MANAGER });
    invalidateStaffHierarchy(GUILD);

    expect((await auth.getAuthority(staffManagerAt(5))).kind).toBe(ManagementAuthority.NONE);
  });

  it("reflects configuration changes immediately after invalidation (§25)", async () => {
    expect(await auth.getPromotionLimit(ownerManagerAt(2))).toBe(SHIP_LEVEL - 1);

    // Move the Ship boundary down; the new ceiling must apply at once.
    await RoleConfigModel.updateOne(
      { guildId: GUILD, roleId: rung(SHIP_LEVEL) },
      { $unset: { boundary: "" } },
    ).exec();
    await RoleConfigModel.updateOne(
      { guildId: GUILD, roleId: rung(8) },
      { $set: { boundary: StaffTier.SHIP } },
    ).exec();
    invalidateStaffHierarchy(GUILD);

    expect(await auth.getPromotionLimit(ownerManagerAt(2))).toBe(7);
  });

  it("isolates guild configuration (§18 of the list)", async () => {
    await seed(OTHER_GUILD, { ship: false });

    const here = staffManagerAt(11, "sm-multi");
    const there = member(
      "sm-multi",
      [R_STAFF_MARKER, R_STAFF_MANAGER, rung(11)],
      false,
      OTHER_GUILD,
    );

    expect(await auth.getPromotionLimit(here)).toBe(SHIP_LEVEL - 1);
    expect(await auth.getPromotionLimit(there)).toBe(11);
  });
});
