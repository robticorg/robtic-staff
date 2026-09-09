import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import mongoose, { Types } from "mongoose";
import { config } from "../../../config/index.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffPointTransactionType } from "../../staff/index.ts";
import { ModmailCaseModel } from "../models/modmail-case.model.ts";
import { CounterModel } from "../models/counter.model.ts";
import { modmailCaseService } from "../services/modmail-case.service.ts";
import { applyClaimCredit } from "../services/claim-credit.ts";
import { ModmailCaseStatus, ModmailCaseType } from "../types/enums.ts";

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

const GUILD = "itest-guild";

describe.skipIf(!hasDb)("atomic claim + point idempotency (MongoDB)", () => {
  beforeAll(async () => {
    await Promise.all([
      ModmailCaseModel.syncIndexes(),
      StaffPointTransactionModel.syncIndexes(),
      StaffModel.syncIndexes(),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      ModmailCaseModel.deleteMany({ guildId: GUILD }),
      CounterModel.deleteMany({ _id: `modmail:${GUILD}` }),
      StaffModel.deleteMany({ guildId: GUILD }),
      StaffPointTransactionModel.deleteMany({ reason: /itest/ }),
      StaffActivityModel.deleteMany({ metadata: { $exists: true } }),
    ]);
    await mongoose.disconnect();
  });

  async function freshCase(): Promise<string> {
    const kase = await modmailCaseService.create({
      guildId: GUILD,
      userId: "reporter-1",
      type: ModmailCaseType.USER_REPORT,
      reportedUserId: "target-1",
      reason: "itest reason",
      description: "itest description",
    });
    return kase.caseId;
  }

  it("only ONE of two concurrent claims wins", async () => {
    const caseId = await freshCase();
    const staffA = new Types.ObjectId();
    const staffB = new Types.ObjectId();

    const [a, b] = await Promise.all([
      modmailCaseService.claimAtomic(caseId, staffA, "disc-a"),
      modmailCaseService.claimAtomic(caseId, staffB, "disc-b"),
    ]);

    const winners = [a, b].filter((r) => r !== null);
    expect(winners).toHaveLength(1);

    const stored = await ModmailCaseModel.findOne({ caseId }).exec();
    expect(stored?.status).toBe(ModmailCaseStatus.CLAIMED);
    expect(stored?.claimedByDiscordId).toBeOneOf(["disc-a", "disc-b"]);

    const late = await modmailCaseService.claimAtomic(caseId, new Types.ObjectId(), "disc-c");
    expect(late).toBeNull();
  });

  it("awards +1 once; a duplicate claim adds no second point", async () => {
    const caseId = await freshCase();
    const staff = await StaffModel.create({ userId: "staff-x", guildId: GUILD });

    const first = await applyClaimCredit(staff._id, caseId);
    const second = await applyClaimCredit(staff._id, caseId);

    expect(first.pointAwarded).toBe(true);
    expect(second.pointAwarded).toBe(false);

    const txns = await StaffPointTransactionModel.countDocuments({
      staffId: staff._id,
      type: StaffPointTransactionType.REPORT_CLAIM,
      referenceId: caseId,
    }).exec();
    expect(txns).toBe(1);

    const reloaded = await StaffModel.findById(staff._id).exec();
    expect(reloaded?.points).toBe(1);
    expect(reloaded?.reportsClaimed).toBe(1);
  });
});
