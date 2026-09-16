import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffPointTransactionModel } from "../models/staff-point-transaction.model.ts";
import { StaffStatus, StaffPointTransactionType } from "../types/enums.ts";
import { staffPointService } from "../services/staff-point.service.ts";
import { staffService } from "../services/staff.service.ts";

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

const GUILD = "point-admin-itest-guild";

async function cleanup(): Promise<void> {
  await Promise.all([
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffPointTransactionModel.deleteMany({}),
  ]);
}

describe.skipIf(!hasDb)("Admin point management (MongoDB)", () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  it("add() then remove() adjust the running balance", async () => {
    const staff = await staffService.create({ userId: "pt-1", guildId: GUILD });

    const added = await staffPointService.add({
      staffId: staff._id,
      amount: 10,
      type: StaffPointTransactionType.MANUAL_ADJUSTMENT,
      reason: "test add",
    });
    expect(added.balance).toBe(10);

    const removed = await staffPointService.remove({
      staffId: staff._id,
      amount: 4,
      type: StaffPointTransactionType.MANUAL_ADJUSTMENT,
      reason: "test remove",
    });
    expect(removed.balance).toBe(6);
    expect(await staffPointService.getAllTimePoints(staff._id)).toBe(6);
  });

  it("resetToZero() writes a compensating transaction and zeroes the all-time total", async () => {
    const staff = await staffService.create({ userId: "pt-2", guildId: GUILD });
    await staffPointService.add({
      staffId: staff._id,
      amount: 25,
      type: StaffPointTransactionType.MANUAL_ADJUSTMENT,
      reason: "seed",
    });

    const result = await staffPointService.resetToZero(staff._id, "admin-1");
    expect(result.reset).toBe(true);
    expect(result.previousBalance).toBe(25);
    expect(await staffPointService.getAllTimePoints(staff._id)).toBe(0);

    const staffDoc = await StaffModel.findById(staff._id).exec();
    expect(staffDoc?.points).toBe(0);
  });

  it("resetToZero() is a no-op when the balance is already 0", async () => {
    const staff = await staffService.create({ userId: "pt-3", guildId: GUILD });

    const result = await staffPointService.resetToZero(staff._id, "admin-1");
    expect(result.reset).toBe(false);
    expect(
      await StaffPointTransactionModel.countDocuments({ staffId: staff._id }).exec(),
    ).toBe(0);
  });

  it("resetAllForGuild() zeroes every staff member in the guild and skips already-zero ones", async () => {
    const a = await staffService.create({ userId: "pt-a", guildId: GUILD });
    const b = await staffService.create({ userId: "pt-b", guildId: GUILD });
    const c = await staffService.create({
      userId: "pt-c",
      guildId: GUILD,
      status: StaffStatus.FIRED,
    });

    await staffPointService.add({
      staffId: a._id,
      amount: 15,
      type: StaffPointTransactionType.MANUAL_ADJUSTMENT,
      reason: "seed a",
    });
    await staffPointService.add({
      staffId: c._id,
      amount: 5,
      type: StaffPointTransactionType.MANUAL_ADJUSTMENT,
      reason: "seed c",
    });

    const summary = await staffPointService.resetAllForGuild(GUILD, "admin-1");
    expect(summary.totalStaff).toBe(3);
    expect(summary.resetCount).toBe(2);

    expect(await staffPointService.getAllTimePoints(a._id)).toBe(0);
    expect(await staffPointService.getAllTimePoints(b._id)).toBe(0);
    expect(await staffPointService.getAllTimePoints(c._id)).toBe(0);
  });
});
