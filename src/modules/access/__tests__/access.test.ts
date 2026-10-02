import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import mongoose from "mongoose";
import { accessConfig } from "../../../config/access.ts";
import { config } from "../../../config/index.ts";
import { canManageTicket } from "../../tickets/services/ticket-permissions.ts";
import { WhitelistModel } from "../models/whitelist.model.ts";
import { hasAdminAccess, isBotOwner } from "../services/admin-access.ts";
import { whitelistService } from "../services/whitelist.service.ts";

const OWNER = "695223884735053905";
const noPerms = { has: () => false };
const adminPerms = { has: (flag: bigint) => flag === PermissionFlagsBits.Administrator };

describe("bot owner", () => {
  it("is the configured user", () => {
    expect(accessConfig.botOwnerId).toBe(OWNER);
    expect(isBotOwner(OWNER)).toBe(true);
    expect(isBotOwner("123")).toBe(false);
    expect(isBotOwner(null)).toBe(false);
  });

  it("has admin access with no Discord permissions at all", () => {
    expect(hasAdminAccess({ id: OWNER, permissions: noPerms })).toBe(true);
    expect(hasAdminAccess({ id: OWNER, permissions: null })).toBe(true);
  });

  it("leaves everyone else to the Administrator permission", () => {
    expect(hasAdminAccess({ id: "1", permissions: adminPerms })).toBe(true);
    expect(hasAdminAccess({ id: "1", permissions: noPerms })).toBe(false);
    expect(hasAdminAccess({ id: "1", permissions: "8" })).toBe(false);
    expect(hasAdminAccess(null)).toBe(false);
  });

  it("passes existing admin checks, e.g. managing any ticket", () => {
    const owner = { id: OWNER, permissions: noPerms } as never;
    const stranger = { id: "1", permissions: noPerms } as never;
    expect(canManageTicket(owner, { claimedByDiscordId: "someone" })).toBe(true);
    expect(canManageTicket(stranger, { claimedByDiscordId: "someone" })).toBe(false);
  });

  it("can always use restricted commands without a database lookup", async () => {
    expect(await whitelistService.canUseRestricted("any-guild", OWNER)).toBe(true);
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

const GUILD = "access-itest-guild";

describe.skipIf(!hasDb)("whitelist (MongoDB)", () => {
  beforeEach(async () => {
    await WhitelistModel.deleteMany({ guildId: { $in: [GUILD, "other-guild"] } });
  });

  afterAll(async () => {
    if (!hasDb) return;
    await WhitelistModel.deleteMany({ guildId: { $in: [GUILD, "other-guild"] } });
    await mongoose.disconnect();
  });

  it("adds once, removes, and is per server", async () => {
    expect(await whitelistService.canUseRestricted(GUILD, "u1")).toBe(false);
    expect(await whitelistService.add(GUILD, "u1", OWNER)).toBe(true);
    expect(await whitelistService.add(GUILD, "u1", OWNER)).toBe(false);
    expect(await whitelistService.canUseRestricted(GUILD, "u1")).toBe(true);
    expect(await whitelistService.canUseRestricted("other-guild", "u1")).toBe(false);
    expect((await whitelistService.list(GUILD)).map((e) => e.userId)).toEqual(["u1"]);
    expect(await whitelistService.remove(GUILD, "u1")).toBe(true);
    expect(await whitelistService.remove(GUILD, "u1")).toBe(false);
    expect(await whitelistService.canUseRestricted(GUILD, "u1")).toBe(false);
  });
});
