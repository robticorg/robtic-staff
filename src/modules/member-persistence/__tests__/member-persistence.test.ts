import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { PunishmentModel } from "../../punishment/models/punishment.model.ts";
import { PunishmentStatus, PunishmentType } from "../../punishment/types/enums.ts";
import { PersistentMemberRoleModel } from "../models/persistent-member-role.model.ts";
import {
  diffPersistentRoles,
  isJailActive,
  memberPersistenceService,
} from "../services/member-persistence.service.ts";

describe("persistent role bookkeeping", () => {
  const configured = new Map([
    [RoleConfigType.TICKET_BLACKLIST, "ticket-bl"],
    [RoleConfigType.BLACKLIST, "staff-bl"],
  ]);

  it("tracks only configured blacklist roles gained or lost", () => {
    expect(
      diffPersistentRoles(configured, new Set(["x", "staff-bl"]), new Set(["x", "ticket-bl"])),
    ).toEqual({ gained: [RoleConfigType.TICKET_BLACKLIST], lost: [RoleConfigType.BLACKLIST] });
    expect(diffPersistentRoles(configured, new Set(["x"]), new Set(["y"]))).toEqual({
      gained: [],
      lost: [],
    });
  });

  it("treats a jail as active until it expires", () => {
    const now = new Date("2026-09-27T00:00:00Z");
    expect(isJailActive(null, now)).toBe(false);
    expect(isJailActive({ expiresAt: null }, now)).toBe(true);
    expect(isJailActive({ expiresAt: new Date("2026-09-28T00:00:00Z") }, now)).toBe(true);
    expect(isJailActive({ expiresAt: new Date("2026-09-26T00:00:00Z") }, now)).toBe(false);
  });
});

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

const GUILD = "persist-itest-guild";
const ROLES = ["ticket-bl", "staff-bl", "gift-bl", "jail", "community"];

function member(id: string, held: string[]) {
  const cache = new Map(held.map((r) => [r, { id: r }]));
  return {
    id,
    partial: false,
    guild: { id: GUILD, roles: { cache: new Map(ROLES.map((r) => [r, { id: r }])) } },
    roles: {
      cache,
      add: async (ids: string[]) => {
        for (const r of ids) cache.set(r, { id: r });
      },
    },
  };
}

describe.skipIf(!hasDb)("rejoin persistence (MongoDB)", () => {
  beforeAll(async () => {
    await PersistentMemberRoleModel.syncIndexes();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await RoleConfigModel.create([
      { guildId: GUILD, roleId: "ticket-bl", type: RoleConfigType.TICKET_BLACKLIST },
      { guildId: GUILD, roleId: "staff-bl", type: RoleConfigType.BLACKLIST },
      { guildId: GUILD, roleId: "gift-bl", type: RoleConfigType.GIFT_BLACKLIST },
      { guildId: GUILD, roleId: "jail", type: RoleConfigType.JAIL },
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      RoleConfigModel.deleteMany({ guildId: GUILD }),
      PersistentMemberRoleModel.deleteMany({ guildId: GUILD }),
      PunishmentModel.deleteMany({ guildId: GUILD }),
    ]);
  });

  it("restores blacklist roles held at leave time, and nothing unrelated", async () => {
    await memberPersistenceService.snapshotOnLeave(
      member("leaver", ["ticket-bl", "gift-bl", "community"]) as never,
    );
    const back = member("leaver", []);
    const restored = await memberPersistenceService.restoreOnJoin(back as never);
    expect(restored.sort()).toEqual(["gift-bl", "ticket-bl"]);
    expect(back.roles.cache.has("community")).toBe(false);
  });

  it("forgets a blacklist that was lifted before the member left", async () => {
    const before = member("lifted", ["staff-bl"]);
    await memberPersistenceService.recordRoleChange(member("lifted", []) as never, before as never);
    await memberPersistenceService.recordRoleChange(before as never, member("lifted", []) as never);
    await memberPersistenceService.snapshotOnLeave(member("lifted", ["community"]) as never);
    expect(await memberPersistenceService.restoreOnJoin(member("lifted", []) as never)).toEqual([]);
  });

  it("restores the jail role only while the jail is still active, without a new punishment", async () => {
    await PunishmentModel.create({
      guildId: GUILD,
      userId: "jailed",
      type: PunishmentType.JAIL,
      status: PunishmentStatus.EXECUTED,
      reason: "itest",
      issuedBy: "mod",
      executedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const back = member("jailed", []);
    expect(await memberPersistenceService.restoreOnJoin(back as never)).toEqual(["jail"]);
    expect(await PunishmentModel.countDocuments({ guildId: GUILD, userId: "jailed" })).toBe(1);

    await PunishmentModel.create({
      guildId: GUILD,
      userId: "served",
      type: PunishmentType.JAIL,
      status: PunishmentStatus.EXECUTED,
      reason: "itest",
      issuedBy: "mod",
      executedAt: new Date(Date.now() - 2 * 86_400_000),
      expiresAt: new Date(Date.now() - 86_400_000),
    });
    expect(await memberPersistenceService.restoreOnJoin(member("served", []) as never)).toEqual([]);
  });
});
