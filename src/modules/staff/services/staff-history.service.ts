import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { IdLike, ListOptions, UserId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { StaffHistoryModel, type StaffHistory } from "../models/staff-history.model.ts";
import { STAFF_HISTORY_ACTION_VALUES, type StaffHistoryAction } from "../types/enums.ts";

export interface RecordHistoryInput {
  staffId: IdLike;
  action: StaffHistoryAction;
  performedBy: UserId;
  previousRoleLevel?: number;
  newRoleLevel?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export class StaffHistoryService extends BaseRepository<StaffHistory> {
  constructor() {
    super(StaffHistoryModel);
  }

  record(input: RecordHistoryInput): Promise<HydratedDocument<StaffHistory>> {
    if (!STAFF_HISTORY_ACTION_VALUES.includes(input.action)) {
      throw new ValidationError("Unknown staff history action", { action: input.action });
    }
    if (!input.performedBy) {
      throw new ValidationError("performedBy is required for every history entry");
    }
    return this.insert({
      staffId: toObjectId(input.staffId),
      action: input.action,
      performedBy: input.performedBy,
      previousRoleLevel: input.previousRoleLevel,
      newRoleLevel: input.newRoleLevel,
      reason: input.reason,
      metadata: input.metadata,
    });
  }

  forStaff(
    staffId: IdLike,
    options: ListOptions & { action?: StaffHistoryAction } = {},
  ): Promise<HydratedDocument<StaffHistory>[]> {
    const filter = options.action
      ? { staffId: toObjectId(staffId), action: options.action }
      : { staffId: toObjectId(staffId) };
    return this.find(filter, options);
  }
}

export const staffHistoryService = new StaffHistoryService();
