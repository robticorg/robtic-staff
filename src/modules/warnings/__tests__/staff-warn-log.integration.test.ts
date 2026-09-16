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
const ANNOUNCE_CH = "chan-staff-warn-announce";
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
    id: ANNOUNCE_CH,
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
    { guildId: GUILD, type: ChannelConfigType.STAFF_WARN_ANNOUNCE },
    { $set: { channelId: ANNOUNCE_CH } },
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
  { reason: `سبب ${tag} ثاني`, evidence: [`https://cdn.discordapp.com/${tag}-2.png`] },
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

  it("posts a Staff Warn شفوي message for a verbal warning", async () => {
    await issueVerbals(guild, target, manager, [
      { reason: "تأخير", evidence: ["https://cdn.discordapp.com/proof.png"] },
    ]);

    expect(sent).toHaveLength(1);
    const lines = sent[0]!.content.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(`**Staff Warn شفوي ${ATTENTION}**`);
    expect(lines[2]).toBe("**السبب : تأخير**");

    const stored = await StaffWarningModel.find({ guildId: GUILD }).exec();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.type).toBe(StaffWarningType.VERBAL);
  });

  it("posts one Staff Warn شفوي message per verbal warning, no escalation before the third", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a").slice(0, 2));
    expect(sent).toHaveLength(2);
    expect(sent[0]!.content.split("\n")[0]).toBe(`**Staff Warn شفوي ${ATTENTION}**`);
    expect(sent[1]!.content.split("\n")[0]).toBe(`**Staff Warn شفوي ${ATTENTION}**`);
  });

  it("posts Staff Warn 1 when three verbals escalate to a real warning", async () => {
    const results = await issueVerbals(guild, target, manager, threeVerbals("a"));

    const escalation = results.at(-1)!.escalation;
    expect(escalation).toBeDefined();
    expect(escalation!.level).toBe(1);

    expect(sent).toHaveLength(4);
    const lines = sent.at(-1)!.content.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(`**Staff Warn 1 ${ATTENTION}**`);
    expect(lines[1]).toBe(`**منشن : <@${target.id}>**`);
  });

  it("escalates to Staff Warn 2 and Staff Warn 3 on the real level", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));
    await issueVerbals(guild, target, manager, threeVerbals("b"));
    await issueVerbals(guild, target, manager, threeVerbals("c"));

    const realMessages = sent.filter((s) => /^\*\*Staff Warn \d/.test(s.content));
    expect(realMessages).toHaveLength(3);
    expect(realMessages[0]!.content.split("\n")[0]).toBe(`**Staff Warn 1 ${ATTENTION}**`);
    expect(realMessages[1]!.content.split("\n")[0]).toBe(`**Staff Warn 2 ${ATTENTION}**`);
    expect(realMessages[2]!.content.split("\n")[0]).toBe(`**Staff Warn 3 ${ATTENTION}**`);
  });

  it("each verbal Staff Warn شفوي message carries its own manager reason", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));

    const verbalMessages = sent.filter((s) => s.content.startsWith("**Staff Warn شفوي"));
    expect(verbalMessages).toHaveLength(3);
    expect(verbalMessages[0]!.content).toContain("سبب a أول");
    expect(verbalMessages[1]!.content).toContain("سبب a ثاني");
    expect(verbalMessages[2]!.content).toContain("سبب a ثالث");
  });

  it("the escalated real warning shows a generic reason and every verbal's proof, never the verbal reasons", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));

    const real = sent.find((s) => /^\*\*Staff Warn \d/.test(s.content))!;
    expect(real.content).toContain("**السبب : حصل على 3 تحذيرات شفوية**");
    expect(real.content).not.toContain("سبب a أول");
    expect(real.content).not.toContain("سبب a ثاني");
    expect(real.content).not.toContain("سبب a ثالث");
    expect(real.content).toContain("https://cdn.discordapp.com/a-1.png");
    expect(real.content).toContain("https://cdn.discordapp.com/a-3.png");
  });

  it("refuses a verbal staff warning with no proof attached", async () => {
    await expect(
      warningActionService.issueVerbalStaffWarning({
        guild: guild as never,
        target: target as never,
        reason: "بدون دليل",
        issuer: manager as never,
        evidence: [],
      }),
    ).rejects.toThrow();

    expect(
      await StaffWarningModel.countDocuments({ guildId: GUILD, type: StaffWarningType.VERBAL }),
    ).toBe(0);
  });

  it("pings only the warned member, never @everyone from a crafted reason", async () => {
    await issueVerbals(guild, target, manager, [
      { reason: "@everyone انتبهوا", evidence: ["https://cdn.discordapp.com/1.png"] },
      { reason: "ثاني", evidence: ["https://cdn.discordapp.com/2.png"] },
      { reason: "ثالث", evidence: ["https://cdn.discordapp.com/3.png"] },
    ]);

    const verbalMsg = sent[0]!;
    expect(verbalMsg.allowedMentions).toEqual({ users: [target.id] });

    expect(verbalMsg.content).toContain("@everyone انتبهوا");
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

  it("keeps the warning stored when STAFF_WARN_ANNOUNCE is not configured", async () => {
    await ChannelConfigModel.deleteMany({ guildId: GUILD, type: ChannelConfigType.STAFF_WARN_ANNOUNCE });

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
    await issueVerbals(guild, target, manager, [
      { reason: "تأخير", evidence: ["https://cdn.discordapp.com/proof.png"] },
    ]);
    const verbal = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.VERBAL,
    }).exec();

    const sentBefore = sent.length;
    const result = await staffWarningLogService.send({
      guild: guild as never,
      warningId: verbal!._id,
    });

    expect(result.outcome).toBe("not-real");

    expect(sent).toHaveLength(sentBefore);
  });

  it("does not delete or repost the log when the warning is revoked (§12)", async () => {
    await issueVerbals(guild, target, manager, threeVerbals("a"));
    const real = await StaffWarningModel.findOne({
      guildId: GUILD,
      type: StaffWarningType.REAL,
    }).exec();
    const messageId = real!.staffWarnMessageId;
    expect(sent).toHaveLength(4);

    await warningActionService.revokeWarning({
      guild: guild as never,
      warningId: real!._id.toString(),
      targetId: target.id,
      actor: manager as never,
      isStaffManager: true,
      reason: "استئناف مقبول",
    });

    expect(sent).toHaveLength(4);
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
