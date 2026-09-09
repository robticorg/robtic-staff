import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { ChannelType } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { ChannelConfigModel } from "../../configuration/models/channel-config.model.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { ChannelConfigType, RoleConfigType } from "../../configuration/types/enums.ts";
import { PunishmentModel } from "../../punishment/models/punishment.model.ts";
import { PunishmentAuditModel } from "../../punishment/models/punishment-audit.model.ts";
import { PunishmentStatus, PunishmentType } from "../../punishment/types/enums.ts";
import { attachPunishmentClient } from "../../punishment/runtime.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import { UserWarningModel } from "../../warnings/models/user-warning.model.ts";
import { WarningStatus } from "../../warnings/types/enums.ts";
import { AppealModel } from "../models/appeal.model.ts";
import { AppealStatus } from "../types/enums.ts";
import { attachAppealClient } from "../runtime.ts";
import { appealService } from "../services/appeal.service.ts";

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

const GUILD = "apl-itest-guild";
const APPEALS_CHANNEL = "apl-chan";
const MUTE_ROLE = "role-mute";
const JAIL_ROLE = "role-jail";

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

const spy = {
  timeoutCleared: [] as string[],
  rolesRemoved: [] as string[],
  bansRemoved: [] as string[],
  dmsSent: 0,
  dmShouldThrow: false,
};

function makeMember(id: string, roleIds: string[] = [], timedOut = false) {
  const cache = new RoleCache();
  for (const r of roleIds) cache.set(r, { id: r });
  return {
    id,
    communicationDisabledUntil: timedOut ? new Date(Date.now() + 60_000) : null,
    timeout: async (value: unknown) => {
      if (value === null) spy.timeoutCleared.push(id);
    },
    roles: {
      cache,
      remove: async (roleId: string) => {
        spy.rolesRemoved.push(roleId);
        cache.delete(roleId);
      },
    },
  };
}

const guildMembers = new Map<string, ReturnType<typeof makeMember>>();

function makeGuild() {
  const roles = new RoleCache();
  for (const r of [MUTE_ROLE, JAIL_ROLE]) roles.set(r, { id: r });
  return {
    id: GUILD,
    roles: { cache: roles },
    members: {
      me: { permissions: { has: () => true } },
      fetch: (id: string) => {
        const m = guildMembers.get(id);
        return m ? Promise.resolve(m) : Promise.reject(new Error("Unknown Member"));
      },
    },
    bans: {
      remove: async (userId: string) => {
        spy.bansRemoved.push(userId);
      },
    },
  };
}

let sent = 0;
const fakeChannel = {
  type: ChannelType.GuildText,
  send: async () => ({ id: `msg-${++sent}` }),
  messages: { fetch: async () => ({ edit: async () => undefined }) },
};

function attachClients() {
  const guild = makeGuild();
  const client = {
    guilds: { cache: new Map([[GUILD, guild]]) },
    channels: { fetch: async () => fakeChannel },
    users: {
      fetch: async (id: string) => {
        if (spy.dmShouldThrow) throw new Error("Cannot send messages to this user");
        return {
          id,
          createDM: async () => ({
            send: async () => {
              spy.dmsSent += 1;
            },
          }),
        };
      },
    },
  };
  attachAppealClient(client as never);
  attachPunishmentClient(client as never);
  return guild;
}

function makeReviewer(id: string) {
  return {
    id,
    guild: { id: GUILD },
    roles: { cache: new RoleCache() },
    permissions: { has: () => true },
  };
}

async function makePunishment(
  overrides: Partial<Record<string, unknown>> = {},
): Promise<{ punishmentId: string }> {
  const doc = await PunishmentModel.create({
    guildId: GUILD,
    userId: "target-user",
    type: PunishmentType.TIMEOUT,
    status: PunishmentStatus.EXECUTED,
    reason: "spam",
    evidence: ["https://cdn.example/x.png"],
    issuedBy: "issuer-1",
    executedBy: "issuer-1",
    executedAt: new Date(),
    evidenceAvailableUntil: new Date(Date.now() + 3 * 86_400_000),
    ...overrides,
  });
  return { punishmentId: doc.punishmentId };
}

async function cleanup(): Promise<void> {
  await Promise.all([
    AppealModel.deleteMany({ guildId: GUILD }),
    PunishmentModel.deleteMany({ guildId: GUILD }),
    PunishmentAuditModel.deleteMany({}),
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffActivityModel.deleteMany({}),
    StaffPointTransactionModel.deleteMany({}),
    UserWarningModel.deleteMany({ guildId: GUILD }),
  ]);
  guildMembers.clear();
  spy.timeoutCleared = [];
  spy.rolesRemoved = [];
  spy.bansRemoved = [];
  spy.dmsSent = 0;
  spy.dmShouldThrow = false;
}

describe.skipIf(!hasDb)("Appeal system (MongoDB + Discord fakes)", () => {
  beforeAll(async () => {
    await Promise.all([AppealModel.syncIndexes(), PunishmentModel.syncIndexes()]);
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await RoleConfigModel.create([
      { guildId: GUILD, roleId: MUTE_ROLE, type: RoleConfigType.MUTE },
      { guildId: GUILD, roleId: JAIL_ROLE, type: RoleConfigType.JAIL },
    ]);
    await ChannelConfigModel.findOneAndUpdate(
      { guildId: GUILD, type: ChannelConfigType.APPEALS },
      { $set: { channelId: APPEALS_CHANNEL } },
      { upsert: true },
    );
  });

  afterAll(async () => {
    await cleanup();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await cleanup();
    attachClients();
  });
  afterEach(async () => {
    await cleanup();
  });

  it("canAppeal: own executed punishment is eligible", async () => {
    const { punishmentId } = await makePunishment();
    const res = await appealService.canAppeal({ userId: "target-user", punishmentId });
    expect(res.ok).toBe(true);
  });

  it("canAppeal: another user's punishment is refused", async () => {
    const { punishmentId } = await makePunishment();
    const res = await appealService.canAppeal({ userId: "someone-else", punishmentId });
    expect(res.ok).toBe(false);
  });

  it("canAppeal: wrong guild is refused", async () => {
    const { punishmentId } = await makePunishment();
    const res = await appealService.canAppeal({
      userId: "target-user",
      guildId: "other-guild",
      punishmentId,
    });
    expect(res.ok).toBe(false);
  });

  it("canAppeal: missing punishment is refused", async () => {
    const res = await appealService.canAppeal({ userId: "target-user", punishmentId: "nope" });
    expect(res.ok).toBe(false);
  });

  it("canAppeal: an expired evidence window does NOT block appealing (§7)", async () => {
    const { punishmentId } = await makePunishment({
      evidenceAvailableUntil: new Date(Date.now() - 1000),
    });
    const res = await appealService.canAppeal({ userId: "target-user", punishmentId });
    expect(res.ok).toBe(true);
  });

  it("createAppeal: creates PENDING, posts the review card, audits APPEAL_SUBMITTED", async () => {
    const { punishmentId } = await makePunishment();
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "It was my brother on my account",
      evidence: ["https://cdn.example/proof.png"],
    });
    expect(appeal.status).toBe(AppealStatus.PENDING);
    expect(appeal.messageId).toMatch(/^msg-/);
    expect(appeal.evidence).toEqual(["https://cdn.example/proof.png"]);

    const audits = await PunishmentAuditModel.find({ punishmentId }).exec();
    expect(audits.map((a) => a.action)).toContain("APPEAL_SUBMITTED");
  });

  it("createAppeal: a duplicate appeal for the same punishment is rejected (§3)", async () => {
    const { punishmentId } = await makePunishment();
    const base = { userId: "target-user", punishmentId, reason: "please" };
    await appealService.createAppeal(base);
    await expect(appealService.createAppeal(base)).rejects.toThrow();
    expect(await AppealModel.countDocuments({ punishmentId })).toBe(1);
  });

  it("createAppeal: empty reason is rejected", async () => {
    const { punishmentId } = await makePunishment();
    await expect(
      appealService.createAppeal({ userId: "target-user", punishmentId, reason: "   " }),
    ).rejects.toThrow();
  });

  it("createAppeal: no APPEALS channel → nothing is created", async () => {
    await ChannelConfigModel.deleteOne({ guildId: GUILD, type: ChannelConfigType.APPEALS });
    const { punishmentId } = await makePunishment();
    await expect(
      appealService.createAppeal({ userId: "target-user", punishmentId, reason: "x" }),
    ).rejects.toThrow();
    expect(await AppealModel.countDocuments({ punishmentId })).toBe(0);
    await ChannelConfigModel.findOneAndUpdate(
      { guildId: GUILD, type: ChannelConfigType.APPEALS },
      { $set: { channelId: APPEALS_CHANNEL } },
      { upsert: true },
    );
  });

  it("claim: first reviewer wins, second is rejected", async () => {
    const { punishmentId } = await makePunishment();
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    const a = makeReviewer("mgr-a");
    await appealService.claimAppeal(appeal.appealId, a as never);
    const stored = await AppealModel.findOne({ appealId: appeal.appealId }).exec();
    expect(stored?.status).toBe(AppealStatus.CLAIMED);
    expect(stored?.claimedBy).toBe("mgr-a");

    await expect(
      appealService.claimAppeal(appeal.appealId, makeReviewer("mgr-b") as never),
    ).rejects.toThrow();

    const acts = await StaffActivityModel.find({ referenceId: appeal.appealId }).exec();
    expect(acts.map((x) => x.type)).toContain("APPEAL_CLAIM");
  });

  it("self-review is blocked server-side (reviewer === issuer)", async () => {
    const { punishmentId } = await makePunishment({ issuedBy: "mgr-self" });
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    await expect(
      appealService.acceptAppeal({
        appealId: appeal.appealId,
        reviewer: makeReviewer("mgr-self") as never,
        decisionReason: "was fair",
      }),
    ).rejects.toThrow();
    const stored = await AppealModel.findOne({ appealId: appeal.appealId }).exec();
    expect(stored?.status).toBe(AppealStatus.PENDING);
  });

  it("unauthorized reviewer cannot decide", async () => {
    const { punishmentId } = await makePunishment();
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    const notManager = {
      id: "rando",
      guild: { id: GUILD },
      roles: { cache: new RoleCache() },
      permissions: { has: () => false },
    };
    await expect(
      appealService.rejectAppeal({
        appealId: appeal.appealId,
        reviewer: notManager as never,
        decisionReason: "no",
      }),
    ).rejects.toThrow();
  });

  it("reject: appeal REJECTED, punishment untouched (§23)", async () => {
    const { punishmentId } = await makePunishment();
    guildMembers.set("target-user", makeMember("target-user", [], true));
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    await appealService.rejectAppeal({
      appealId: appeal.appealId,
      reviewer: makeReviewer("mgr-r") as never,
      decisionReason: "Evidence is clear",
    });
    const [ap, pun] = await Promise.all([
      AppealModel.findOne({ appealId: appeal.appealId }).exec(),
      PunishmentModel.findOne({ punishmentId }).exec(),
    ]);
    expect(ap?.status).toBe(AppealStatus.REJECTED);
    expect(ap?.reviewedBy).toBe("mgr-r");
    expect(pun?.status).toBe(PunishmentStatus.EXECUTED);
    expect(spy.dmsSent).toBe(1);
  });

  it("accept TIMEOUT: clears the timeout and revokes the punishment", async () => {
    const { punishmentId } = await makePunishment({ type: PunishmentType.TIMEOUT });
    guildMembers.set("target-user", makeMember("target-user", [], true));
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    await appealService.acceptAppeal({
      appealId: appeal.appealId,
      reviewer: makeReviewer("mgr-t") as never,
      decisionReason: "overturned",
    });
    expect(spy.timeoutCleared).toContain("target-user");
    const pun = await PunishmentModel.findOne({ punishmentId }).exec();
    expect(pun?.status).toBe(PunishmentStatus.REVOKED);
    expect(pun?.appealId).toBe(appeal.appealId);
    expect(pun?.revokedBy).toBe("mgr-t");
  });

  it("accept MUTE / JAIL: removes the configured role", async () => {
    for (const [type, role] of [
      [PunishmentType.MUTE, MUTE_ROLE],
      [PunishmentType.JAIL, JAIL_ROLE],
    ] as const) {
      await cleanup();
      attachClients();
      const { punishmentId } = await makePunishment({ type });
      guildMembers.set("target-user", makeMember("target-user", [role]));
      const { appeal } = await appealService.createAppeal({
        userId: "target-user",
        punishmentId,
        reason: "x",
      });
      await appealService.acceptAppeal({
        appealId: appeal.appealId,
        reviewer: makeReviewer("mgr-m") as never,
        decisionReason: "ok",
      });
      expect(spy.rolesRemoved).toContain(role);
    }
  });

  it("accept KICK: just marks REVOKED (nothing to undo)", async () => {
    const { punishmentId } = await makePunishment({ type: PunishmentType.KICK });
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    await appealService.acceptAppeal({
      appealId: appeal.appealId,
      reviewer: makeReviewer("mgr-k") as never,
      decisionReason: "ok",
    });
    const pun = await PunishmentModel.findOne({ punishmentId }).exec();
    expect(pun?.status).toBe(PunishmentStatus.REVOKED);
  });

  it("accept BAN: unbans the user", async () => {
    const { punishmentId } = await makePunishment({ type: PunishmentType.BAN });
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    await appealService.acceptAppeal({
      appealId: appeal.appealId,
      reviewer: makeReviewer("mgr-ban") as never,
      decisionReason: "ok",
    });
    expect(spy.bansRemoved).toContain("target-user");
    const pun = await PunishmentModel.findOne({ punishmentId }).exec();
    expect(pun?.status).toBe(PunishmentStatus.REVOKED);
  });

  it("accept WARN: revokes the warning and applies −2 to the issuer, once", async () => {
    const issuerStaff = await StaffModel.create({
      userId: "issuer-1",
      guildId: GUILD,
      currentRoleLevel: 2,
    });
    const warning = await UserWarningModel.create({
      userId: "target-user",
      guildId: GUILD,
      reason: "spam",
      issuedBy: "issuer-1",
      status: WarningStatus.ACTIVE,
    });
    const { punishmentId } = await makePunishment({
      type: PunishmentType.WARN,
      metadata: { warningId: warning._id.toString() },
    });
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "not me",
    });

    await appealService.acceptAppeal({
      appealId: appeal.appealId,
      reviewer: makeReviewer("mgr-w") as never,
      decisionReason: "overturned",
    });

    const revokedWarning = await UserWarningModel.findById(warning._id).exec();
    expect(revokedWarning?.status).toBe(WarningStatus.REVOKED);

    const txns = await StaffPointTransactionModel.find({
      staffId: issuerStaff._id,
      type: "APPEAL_SUCCESS_PENALTY",
    }).exec();
    expect(txns).toHaveLength(1);
    expect(txns[0]?.amount).toBe(-2);

    const storedAppeal = await AppealModel.findOne({ appealId: appeal.appealId }).exec();
    expect(storedAppeal?.penaltyAppliedAt).toBeInstanceOf(Date);

    const dup = await StaffPointTransactionModel.countDocuments({
      staffId: issuerStaff._id,
      type: "APPEAL_SUCCESS_PENALTY",
      referenceId: appeal.appealId,
    });
    expect(dup).toBe(1);
  });

  it("accept vs reject race: exactly one decision wins", async () => {
    const { punishmentId } = await makePunishment();
    guildMembers.set("target-user", makeMember("target-user", [], true));
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    const rev = makeReviewer("mgr-race");
    const results = await Promise.allSettled([
      appealService.acceptAppeal({ appealId: appeal.appealId, reviewer: rev as never, decisionReason: "yes" }),
      appealService.rejectAppeal({ appealId: appeal.appealId, reviewer: rev as never, decisionReason: "no" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const stored = await AppealModel.findOne({ appealId: appeal.appealId }).exec();
    expect(stored?.status).toBeOneOf([AppealStatus.ACCEPTED, AppealStatus.REJECTED]);
  });

  it("double accept: punishment is revoked only once", async () => {
    const { punishmentId } = await makePunishment();
    guildMembers.set("target-user", makeMember("target-user", [], true));
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    const rev = makeReviewer("mgr-dbl");
    const results = await Promise.allSettled([
      appealService.acceptAppeal({ appealId: appeal.appealId, reviewer: rev as never, decisionReason: "a" }),
      appealService.acceptAppeal({ appealId: appeal.appealId, reviewer: rev as never, decisionReason: "b" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const revokedAudits = await PunishmentAuditModel.find({ punishmentId, action: "REVOKED" }).exec();
    expect(revokedAudits).toHaveLength(1);
  });

  it("a failing decision DM does not roll back the decision", async () => {
    const { punishmentId } = await makePunishment();
    guildMembers.set("target-user", makeMember("target-user", [], true));
    const { appeal } = await appealService.createAppeal({
      userId: "target-user",
      punishmentId,
      reason: "x",
    });
    spy.dmShouldThrow = true;
    await appealService.acceptAppeal({
      appealId: appeal.appealId,
      reviewer: makeReviewer("mgr-dm") as never,
      decisionReason: "ok",
    });
    const stored = await AppealModel.findOne({ appealId: appeal.appealId }).exec();
    expect(stored?.status).toBe(AppealStatus.ACCEPTED);
  });
});
