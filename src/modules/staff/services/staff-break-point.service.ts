import type { Types } from "mongoose";
import type { GuildId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { StaffBreakPointModel } from "../models/staff-break-point.model.ts";
import type { StaffPointTransactionType } from "../types/enums.ts";

export interface AddBreakPointsInput {
  staffId: Types.ObjectId;
  guildId: GuildId;
  amount: number;
  type: StaffPointTransactionType;
  reason: string;
  referenceId?: string;
}

export interface AddBreakPointsResult {
  /** Sum of all break points this staff member has — separate from their real points. */
  breakPoints: number;
  duplicate: boolean;
}

/** Records points earned on break. Never counted in totals, leaderboards or the points balance. */
export class StaffBreakPointService {
  async add(input: AddBreakPointsInput): Promise<AddBreakPointsResult> {
    let duplicate = false;
    try {
      await StaffBreakPointModel.create({
        staffId: input.staffId,
        guildId: input.guildId,
        amount: input.amount,
        type: input.type,
        reason: input.reason.trim(),
        referenceId: input.referenceId,
      });
    } catch (err) {
      if (!input.referenceId || !isDuplicateKeyError(err)) throw err;
      duplicate = true;
    }
    return { breakPoints: await this.total(input.staffId), duplicate };
  }

  async total(staffId: Types.ObjectId): Promise<number> {
    const [row] = await StaffBreakPointModel.aggregate<{ total: number }>([
      { $match: { staffId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  }
}

export const staffBreakPointService = new StaffBreakPointService();
