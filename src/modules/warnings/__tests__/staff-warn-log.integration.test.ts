import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { ChannelType } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { ChannelConfigModel } from "../../configuration/models/channel-config.model.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { ChannelConfigType, RoleConfigType } from "../../configuration/types/enums.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffHistoryModel } from "../../staff/models/staff-history.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { StaffWarningModel } from "../models/staff-warning.model.ts";
import { StaffWarningType, WarningStatus } from "../types/enums.ts";
import { staffWarningLogService } from "../services/staff-warning-log.service.ts";
import { warningActionService } from "../services/warning-actions.service.ts";

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

const GUILD = "warnlog-itest-guild";
const STAFF_WARNS_CH = "chan-staff-warns";
const ATTENTION = "<:Attention:1486103485756870726>";

const R_START = "wl-start";
const R_END = "wl-end";
const R_WARN1 = "wl-warn-1";
const R_WARN2 = "wl-warn-2";
const R_WARN3 = "wl-warn-3";
const R_BLACKLIST = "wl-blacklist";

interface Sent {
  content: string;
  allowedMentions?: { users?: string[] };
}

let sent: Sent[] = [];
let sendShouldFail = false;
let channelMissing = false;
let messageSeq = 0;

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

function makeGuild() {
  const roleCache = new RoleCache();
  for (const id of [R_START, R_END, R_WARN1, R_WARN2, R_WARN3, R_BLACKLIST]) {
    roleCache.set(id, { id });
  }

  const textChannel = {
    id: STAFF_WARNS_CH,
    type: ChannelType.GuildText,
    isTextBased: () => true,
    send: async (payload: Sent) => {
      if (sendShouldFail) throw new Error("Missing Permissions");
      sent.push(payload);
      return { id: `msg-${++messageSeq}` };
    },
  };

  const members = new Map<string, unknown>();
  const guild = {
    id: GUILD,
    roles: { cache: roleCache },
    channels: {
      fetch: async () => (channelMissing ? null : textChannel),
    },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { comparePositionTo: () => 1 } },
      },
      _members: members,
      fetch: async (id: string) => members.get(id) ?? Promise.reject(new Error("Unknown Member")),
    },
  };
  return guild;
}

function makeMember(guild: ReturnType<typeof makeGuild>, id: string, roleIds: string[] = []) {
  const cache = new RoleCache();
  for (const r of roleIds) cache.set(r, { id: r });
  const member = {
    id,
    guild,
    permissions: { has: () => true },
    roles: {
      cache,
      add: async (ids: string | string[]) => {
        for (const i of Array.isArray(ids) ? ids : [ids]) cache.set(i, { id: i });
      },
      remove: async (ids: string | string[]) => {
        for (const i of Array.isArray(ids) ? ids : [ids]) cache.delete(i);
      },
    },
  };
  guild.members._members.set(id, member);
  return member;
}

async function seedConfig(): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId: GUILD });
  await RoleConfigModel.create([
    { guildId: GUILD, roleId: R_START, type: RoleConfigType.START, level: 0 },
    { guildId: GUILD, roleId: R_END, type: RoleConfigType.END, level: 3 },
    { guildId: GUILD, roleId: R_WARN1, type: RoleConfigType.WARN_1 },
    { guildId: GUILD, roleId: R_WARN2, type: RoleConfigType.WARN_2 },
    { guildId: GUILD, roleId: R_WARN3, type: RoleConfigType.WARN_3 },
    { guildId: GUILD, roleId: R_BLACKLIST, type: RoleConfigType.BLACKLIST },
  ]);
  await ChannelConfigModel.findOneAndUpdate(
    { guildId: GUILD, type: ChannelConfigType.STAFF_WARNS },
    { $set: { channelId: STAFF_WARNS_CH } },
    { upsert: true },
  );
}

async function cleanup(): Promise<void> {
  await Promise.all([
    StaffWarningModel.deleteMany({ guildId: GUILD }),
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffActivityModel.deleteMany({}),
    StaffHistoryModel.deleteMany({}),
    StaffPointTransactionModel.deleteMany({}),
  ]);
}

/** Issues `count` verbal warnings, each with its own reason and proof. */
async function issueVerbals(
  guild: ReturnType<typeof makeGuild>,
  target: ReturnType<typeof makeMember>,
  issuer: ReturnType<typeof makeMember>,
  entries: { reason: string; evidence: string[] }[],
) {
  const results = [];
  for (const entry of entries) {
    results.push(
      await warningActionService.issueVerbalStaffWarning({
        guild: guild as never,
        target: target as never,
        reason: entry.reason,
        issuer: issuer as never,
        evidence: entry.evidence,
      }),
    );
  }
  return results;
}

const threeVerbals = (tag: string) => [
  { reason: `سبب ${tag} أول`, evidence: [`https://cdn.discordapp.com/${tag}-1.png`] },
  { reason: `سبب ${tag} ثاني`, evidence: [] },
  { reason: `سبب ${tag} ثالث`, evidence: [`https://cdn.discordapp.com/${tag}-3.png`] },
];

describe.skipIf(!hasDb)("Staff Warn channel logging (MongoDB + Discord fakes)", () => {
  let guild: ReturnType<typeof makeGuild>;
  let target: ReturnType<typeof makeMember>;
  let manager: ReturnType<typeof makeMember>;

  beforeEach(async () => {
    sent = [];
    sendShouldFail = false;
    channelMissing = false;
    guild = makeGuild();
    target = makeMember(guild, "staff-target", [R_START]);
    manager = makeMember(guild, "staff-manager");
    await seedConfig();
    await cleanup();

    await StaffModel.create({
      guildId: GUILD,
      userId: target.id,
      status: StaffStatus.ACTIVE,
      currentRoleLevel: 2,
    });
  });

  afterAll(async () => {
    await cleanup();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
  });

  it("does not post anything for a verbal warning", async () => {
    await issueVerbals(guild, target, manager, [
      { reason: "تأخير", evidence: [] },
    ]);

    expect(sent).toHaveLength(0);
    const stored = await StaffWarningModel.find({ guildId: GUILD }).exec();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.type).toBe(StaffWarningType.VERBAL);
  });

  it("posts nothing after only two verbal warnings", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a").slice(0, 2));
    expect(sent).toHaveLength(0);
  });

  it("posts Staff Warn 1 when three verbals escalate to a real warning", async () => {
    const results = await issueVerbals(guild, target, manager, threeVerbals("a"));

    const escalation = results.at(-1)!.escalation;
    expect(escalation).toBeDefined();
    expect(escalation!.level).toBe(1);

    expect(sent).toHaveLength(1);
    const lines = sent[0]!.content.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(`**Staff Warn 1 ${ATTENTION}**`);
    expect(lines[1]).toBe(`**منشن : <@${target.id}>**`);
  });

  it("escalates to Staff Warn 2 and Staff Warn 3 on the real level", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));
    await issueVerbals(guild, target, manager, threeVerbals("b"));
    await issueVerbals(guild, target, manager, threeVerbals("c"));

    expect(sent).toHaveLength(3);
    expect(sent[0]!.content.split("\n")[0]).toBe(`**Staff Warn 1 ${ATTENTION}**`);
    expect(sent[1]!.content.split("\n")[0]).toBe(`**Staff Warn 2 ${ATTENTION}**`);
    expect(sent[2]!.content.split("\n")[0]).toBe(`**Staff Warn 3 ${ATTENTION}**`);
  });

  it("carries the managers' reasons and every proof onto the real warning log", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));

    const content = sent[0]!.content;
    expect(content).toContain("سبب a أول");
    expect(content).toContain("سبب a ثاني");
    expect(content).toContain("سبب a ثالث");
    expect(content).toContain("https://cdn.discordapp.com/a-1.png");
    expect(content).toContain("https://cdn.discordapp.com/a-3.png");
  });

  it("shows لا يوجد when no verbal warning carried proof", async () => {
    await issueVerbals(guild, target, manager, [
      { reason: "أول", evidence: [] },
      { reason: "ثاني", evidence: [] },
      { reason: "ثالث", evidence: [] },
    ]);

    expect(sent[0]!.content).toContain("**الدليل : لا يوجد**");
  });

  it("pings only the warned member, never @everyone from a crafted reason", async () => {
    await issueVerbals(guild, target, manager, [
      { reason: "@everyone انتبهوا", evidence: [] },
      { reason: "ثاني", evidence: [] },
      { reason: "ثالث", evidence: [] },
    ]);

    expect(sent[0]!.allowedMentions).toEqual({ users: [target.id] });
    // The text is preserved verbatim; only the mention policy neutralises it.
    expect(sent[0]!.content).toContain("@everyone انتبهوا");
  });

  it("stores the log message id on the real warning", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));

    const real = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.REAL,
    }).exec();
    expect(real!.staffWarnMessageId).toBeDefined();
    expect(real!.staffWarnMessageId).toMatch(/^msg-\d+$/);
  });

  it("keeps the warning stored when STAFF_WARNS is not configured", async () => {
    await ChannelConfigModel.deleteMany({ guildId: GUILD, type: ChannelConfigType.STAFF_WARNS });

    const results = await issueVerbals(guild, target, manager, threeVerbals("a"));

    expect(results.at(-1)!.escalation).toBeDefined();
    expect(sent).toHaveLength(0);
    const real = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.REAL,
    }).exec();
    expect(real).not.toBeNull();
    expect(real!.status).toBe(WarningStatus.ACTIVE);
    expect(real!.staffWarnMessageId).toBeUndefined();
  });

  it("keeps the warning stored when Discord refuses the send", async () => {
    sendShouldFail = true;

    const results = await issueVerbals(guild, target, manager, threeVerbals("a"));

    expect(results.at(-1)!.escalation).toBeDefined();
    const real = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.REAL,
    }).exec();
    expect(real).not.toBeNull();
    expect(real!.status).toBe(WarningStatus.ACTIVE);
    expect(real!.staffWarnMessageId).toBeUndefined();
  });

  it("keeps the warning stored when the channel has vanished", async () => {
    channelMissing = true;

    await issueVerbals(guild, target, manager, threeVerbals("a"));

    const real = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.REAL,
    }).exec();
    expect(real).not.toBeNull();
    expect(sent).toHaveLength(0);
  });

  it("refuses to log a verbal warning even if asked directly", async () => {
    await issueVerbals(guild, target, manager, [{ reason: "تأخير", evidence: [] }]);
    const verbal = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.VERBAL,
    }).exec();

    const result = await staffWarningLogService.send({
      guild: guild as never,
      warningId: verbal!._id,
    });

    expect(result.outcome).toBe("not-real");
    expect(sent).toHaveLength(0);
  });

  it("does not delete or repost the log when the warning is revoked (§12)", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));
    const real = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.REAL,
    }).exec();
    const messageId = real!.staffWarnMessageId;
    expect(sent).toHaveLength(1);

    await warningActionService.revokeWarning({
      guild: guild as never,
      warningId: real!._id.toString(),
      targetId: target.id,
      actor: manager as never,
      isStaffManager: true,
      reason: "استئناف مقبول",
    });

    // Still exactly one message, and the id is still on the record.
    expect(sent).toHaveLength(1);
    const after = await StaffWarningModel.findById(real!._id).exec();
    expect(after!.status).toBe(WarningStatus.REMOVED);
    expect(after!.staffWarnMessageId).toBe(messageId as string);
  });

  it("is idempotent per real warning — re-sending does not duplicate the record", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));
    const real = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.REAL,
    }).exec();

    const again = await staffWarningLogService.send({
      guild: guild as never,
      warningId: real!._id,
    });

    expect(again.outcome).toBe("sent");
    // No second warning row was created for the log.
    expect(
      await StaffWarningModel.countDocuments({ guildId: GUILD, type: StaffWarningType.REAL }),
    ).toBe(1);
  });

  it("reports not-found for an unknown warning id", async () => {
    const result = await staffWarningLogService.send({
      guild: guild as never,
      warningId: new mongoose.Types.ObjectId(),
    });
    expect(result.outcome).toBe("not-found");
  });
});
