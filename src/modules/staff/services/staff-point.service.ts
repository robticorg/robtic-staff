import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import { config } from "../../../config/index.ts";
import type { IdLike, ListOptions, MongoFilter } from "../../../shared/types/index.ts";
import { isDuplicateKeyError, ValidationError } from "../../../shared/utils/errors.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { periodStart, type PointsPeriod } from "../../../shared/utils/time.ts";
import { StaffModel } from "../models/staff.model.ts";
import {
  StaffPointTransactionModel,
  type StaffPointTransaction,
} from "../models/staff-point-transaction.model.ts";
import {
  STAFF_POINT_TRANSACTION_TYPE_VALUES,
  type StaffPointTransactionType,
} from "../types/enums.ts";

const log = logger.child("staff-points");

export interface AddPointsInput {
  staffId: IdLike;

  amount: number;
  type: StaffPointTransactionType;
  reason: string;

  referenceId?: string;

  allowDuplicate?: boolean;
}

export interface AddPointsResult {
  transaction: HydratedDocument<StaffPointTransaction> | null;

  balance: number | null;

  duplicate: boolean;
}

export interface PointsSummary {
  daily: number;
  weekly: number;
  monthly: number;
  allTime: number;
}

export class StaffPointService extends BaseRepository<StaffPointTransaction> {
  constructor() {
    super(StaffPointTransactionModel);
  }

  async add(input: AddPointsInput): Promise<AddPointsResult> {
    if (!STAFF_POINT_TRANSACTION_TYPE_VALUES.includes(input.type)) {
      throw new ValidationError("Unknown point transaction type", { type: input.type });
    }
    if (!Number.isFinite(input.amount)) {
      throw new ValidationError("Point amount must be a finite number", { amount: input.amount });
    }
    if (!input.reason?.trim()) {
      throw new ValidationError("A reason is required for every point transaction");
    }

    const staffObjectId = toObjectId(input.staffId);

    let transaction: HydratedDocument<StaffPointTransaction>;
    try {
      transaction = await this.model.create({
        staffId: staffObjectId,
        amount: input.amount,
        type: input.type,
        referenceId: input.referenceId,
        reason: input.reason.trim(),
      });
    } catch (err) {
      if (input.referenceId && !input.allowDuplicate && isDuplicateKeyError(err)) {
        log.warn("Duplicate point award ignored", {
          staffId: String(staffObjectId),
          type: input.type,
          referenceId: input.referenceId,
        });
        const staff = await StaffModel.findById(staffObjectId, { points: 1 }).exec();
        return { transaction: null, balance: staff?.points ?? null, duplicate: true };
      }
      throw err;
    }

    const staff = await StaffModel.findByIdAndUpdate(
      staffObjectId,
      { $inc: { points: input.amount } },
      { returnDocument: "after", projection: { points: 1 } },
    ).exec();

    if (!staff) {
      log.error("Point transaction written for unknown staff", {
        staffId: String(staffObjectId),
        transactionId: String(transaction._id),
      });
    }

    return { transaction, balance: staff?.points ?? null, duplicate: false };
  }

  remove(input: AddPointsInput): Promise<AddPointsResult> {
    return this.add({ ...input, amount: -Math.abs(input.amount) });
  }

  private async sumSince(staffId: IdLike, since: Date | null): Promise<number> {
    const match: MongoFilter<StaffPointTransaction> = { staffId: toObjectId(staffId) };
    if (since) match.createdAt = { $gte: since };
    const [row] = await this.model.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  }

  getPoints(staffId: IdLike, period: PointsPeriod, now?: Date): Promise<number> {
    const since = periodStart(period, { zone: config.timezone, now });
    return this.sumSince(staffId, since);
  }

  getDailyPoints(staffId: IdLike, now?: Date): Promise<number> {
    return this.getPoints(staffId, "day", now);
  }

  getWeeklyPoints(staffId: IdLike, now?: Date): Promise<number> {
    return this.getPoints(staffId, "week", now);
  }

  getMonthlyPoints(staffId: IdLike, now?: Date): Promise<number> {
    return this.getPoints(staffId, "month", now);
  }

  getAllTimePoints(staffId: IdLike): Promise<number> {
    return this.sumSince(staffId, null);
  }

  async getSummary(staffId: IdLike, now?: Date): Promise<PointsSummary> {
    const [daily, weekly, monthly, allTime] = await Promise.all([
      this.getDailyPoints(staffId, now),
      this.getWeeklyPoints(staffId, now),
      this.getMonthlyPoints(staffId, now),
      this.getAllTimePoints(staffId),
    ]);
    return { daily, weekly, monthly, allTime };
  }

  async recalculateBalance(staffId: IdLike): Promise<number> {
    const total = await this.getAllTimePoints(staffId);
    await StaffModel.findByIdAndUpdate(toObjectId(staffId), { $set: { points: total } }).exec();
    return total;
  }

  listTransactions(
    staffId: IdLike,
    options: ListOptions & { type?: StaffPointTransactionType } = {},
  ): Promise<HydratedDocument<StaffPointTransaction>[]> {
    const filter: MongoFilter<StaffPointTransaction> = { staffId: toObjectId(staffId) };
    if (options.type) filter.type = options.type;
    return this.find(filter, options);
  }
}

export const staffPointService = new StaffPointService();
