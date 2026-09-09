import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { ModmailCaseModel } from "../../modmail/models/modmail-case.model.ts";
import { CounterModel } from "../../modmail/models/counter.model.ts";
import { modmailCaseService } from "../../modmail/services/modmail-case.service.ts";
import { ModmailCaseType } from "../../modmail/types/enums.ts";
import { PunishmentModel } from "../models/punishment.model.ts";
import { PunishmentApprovalModel } from "../models/punishment-approval.model.ts";
import { PunishmentAuditModel } from "../models/punishment-audit.model.ts";
import { punishmentService } from "../services/punishment.service.ts";
import {
  PunishmentApprovalStatus,
  PunishmentAuditAction,
  PunishmentStatus,
  PunishmentType,
} from "../types/enums.ts";

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

const GUILD = "pun-itest-guild";

describe.skipIf(!hasDb)("Punishment persistence + concurrency (MongoDB)", () => {
  beforeAll(async () => {
    await Promise.all([
      PunishmentModel.syncIndexes(),
      PunishmentApprovalModel.syncIndexes(),
      PunishmentAuditModel.syncIndexes(),
      ModmailCaseModel.syncIndexes(),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      PunishmentModel.deleteMany({ guildId: GUILD }),
      PunishmentApprovalModel.deleteMany({ guildId: GUILD }),
      PunishmentAuditModel.deleteMany({ punishmentId: /./ }),
      ModmailCaseModel.deleteMany({ guildId: GUILD }),
      CounterModel.deleteMany({ _id: `modmail:${GUILD}` }),
    ]);
    await mongoose.disconnect();
  });

  it("createPunishment persists a PENDING record + CREATED audit row", async () => {
    const p = await punishmentService.createPunishment({
      guildId: GUILD,
      userId: "target-1",
      type: PunishmentType.TIMEOUT,
      reason: "itest timeout",
      evidence: ["https://cdn.example/x.png"],
      issuedBy: "staff-1",
      durationMs: 600_000,
    });

    expect(p.status).toBe(PunishmentStatus.PENDING);
    expect(p.punishmentId).toBeString();
    expect(p.duration).toBe(600_000);

    const stored = await PunishmentModel.findOne({ punishmentId: p.punishmentId }).exec();
    expect(stored?.reason).toBe("itest timeout");
    expect(stored?.evidence).toEqual(["https://cdn.example/x.png"]);

    const audit = await PunishmentAuditModel.find({ punishmentId: p.punishmentId }).exec();
    expect(audit.map((a) => a.action)).toContain(PunishmentAuditAction.CREATED);
  });

  it("createPunishment refuses a staff member punishing themselves", async () => {
    await expect(
      punishmentService.createPunishment({
        guildId: GUILD,
        userId: "same-user",
        type: PunishmentType.WARN,
        reason: "itest self",
        issuedBy: "same-user",
      }),
    ).rejects.toThrow();
  });

  it("a second status flip from the same origin state loses the race", async () => {
    const p = await punishmentService.createPunishment({
      guildId: GUILD,
      userId: "target-2",
      type: PunishmentType.KICK,
      reason: "itest race",
      issuedBy: "staff-2",
    });
    await punishmentService.markApprovalRequested(p.punishmentId);

    const [a, b] = await Promise.allSettled([
      punishmentService.markApproved(p.punishmentId, "admin-a"),
      punishmentService.markApproved(p.punishmentId, "admin-b"),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const stored = await PunishmentModel.findOne({ punishmentId: p.punishmentId }).exec();
    expect(stored?.status).toBe(PunishmentStatus.APPROVED);
    expect(stored?.approvedBy).toBeOneOf(["admin-a", "admin-b"]);
  });

  it("only one of two concurrent approval decisions wins the atomic update", async () => {
    const p = await punishmentService.createPunishment({
      guildId: GUILD,
      userId: "target-3",
      type: PunishmentType.BAN,
      reason: "itest approval race",
      issuedBy: "staff-3",
    });
    const approval = await PunishmentApprovalModel.create({
      guildId: GUILD,
      punishmentId: p.punishmentId,
      type: "BAN",
      requestedBy: "staff-3",
      channelId: "chan-1",
      messageId: "msg-1",
    });

    const flip = (decidedBy: string) =>
      PunishmentApprovalModel.findOneAndUpdate(
        { approvalId: approval.approvalId, status: PunishmentApprovalStatus.PENDING },
        { $set: { status: PunishmentApprovalStatus.APPROVED, decidedBy, decidedAt: new Date() } },
        { returnDocument: "after" },
      ).exec();

    const [x, y] = await Promise.all([flip("admin-x"), flip("admin-y")]);
    const winners = [x, y].filter((r) => r !== null);
    expect(winners).toHaveLength(1);
  });

  it("the partial unique index forbids two live approvals for one punishment", async () => {
    const p = await punishmentService.createPunishment({
      guildId: GUILD,
      userId: "target-4",
      type: PunishmentType.KICK,
      reason: "itest dup approval",
      issuedBy: "staff-4",
    });
    const base = {
      guildId: GUILD,
      punishmentId: p.punishmentId,
      type: "KICK" as const,
      requestedBy: "staff-4",
      channelId: "chan-2",
      messageId: "msg-2",
    };
    await PunishmentApprovalModel.create(base);
    await expect(
      PunishmentApprovalModel.create({ ...base, messageId: "msg-3" }),
    ).rejects.toThrow();
  });

  it("links the punishment back onto the report via attachResolution (§23)", async () => {
    const kase = await modmailCaseService.create({
      guildId: GUILD,
      userId: "reporter-9",
      type: ModmailCaseType.USER_REPORT,
      reportedUserId: "target-9",
      reason: "itest link reason",
      description: "itest link description",
    });
    const p = await punishmentService.createPunishment({
      guildId: GUILD,
      userId: "target-9",
      type: PunishmentType.TIMEOUT,
      reason: "itest link",
      reportId: kase.caseId,
      issuedBy: "staff-9",
      durationMs: 300_000,
    });

    await modmailCaseService.attachResolution(kase.caseId, {
      resolutionType: PunishmentType.TIMEOUT,
      punishmentId: p.punishmentId,
      resolvedBy: "staff-9",
    });

    const stored = await ModmailCaseModel.findOne({ caseId: kase.caseId }).exec();
    expect(stored?.punishmentId).toBe(p.punishmentId);
    expect(stored?.resolutionType).toBe(PunishmentType.TIMEOUT);
    expect(stored?.resolvedBy).toBe("staff-9");
  });

  it("getUserRecentPunishment returns the newest executed, non-NO_ACTION punishment", async () => {
    const older = await punishmentService.createPunishment({
      guildId: GUILD,
      userId: "target-history",
      type: PunishmentType.TIMEOUT,
      reason: "itest older",
      issuedBy: "staff-h",
      durationMs: 60_000,
    });
    await PunishmentModel.updateOne(
      { punishmentId: older.punishmentId },
      { $set: { status: PunishmentStatus.EXECUTED, executedAt: new Date(Date.now() - 100_000) } },
    ).exec();

    const newer = await punishmentService.createPunishment({
      guildId: GUILD,
      userId: "target-history",
      type: PunishmentType.MUTE,
      reason: "itest newer",
      issuedBy: "staff-h",
    });
    await PunishmentModel.updateOne(
      { punishmentId: newer.punishmentId },
      { $set: { status: PunishmentStatus.EXECUTED, executedAt: new Date() } },
    ).exec();

    const recent = await punishmentService.getUserRecentPunishment("target-history", GUILD);
    expect(recent?.punishment.punishmentId).toBe(newer.punishmentId);
    expect(recent?.canAppeal).toBe(true);
  });
});
