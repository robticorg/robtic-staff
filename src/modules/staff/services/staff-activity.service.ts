import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { IdLike, ListOptions, MongoFilter } from "../../../shared/types/index.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { StaffActivityModel, type StaffActivity } from "../models/staff-activity.model.ts";
import { STAFF_ACTIVITY_TYPE_VALUES, type StaffActivityType } from "../types/enums.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";

export interface RecordActivityInput {
  staffId: IdLike;
  type: StaffActivityType;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityQuery extends ListOptions {
  staffId?: IdLike;
  type?: StaffActivityType;
  referenceId?: string;
}

export class StaffActivityService extends BaseRepository<StaffActivity> {
  constructor() {
    super(StaffActivityModel);
  }

  create(input: RecordActivityInput): Promise<HydratedDocument<StaffActivity>> {
    if (!STAFF_ACTIVITY_TYPE_VALUES.includes(input.type)) {
      throw new ValidationError("Unknown staff activity type", { type: input.type });
    }
    return this.insert({
      staffId: toObjectId(input.staffId),
      type: input.type,
      referenceId: input.referenceId,
      metadata: input.metadata,
    });
  }

  list(query: ActivityQuery = {}): Promise<HydratedDocument<StaffActivity>[]> {
    const filter: MongoFilter<StaffActivity> = {};
    if (query.staffId) filter.staffId = toObjectId(query.staffId);
    if (query.type) filter.type = query.type;
    if (query.referenceId) filter.referenceId = query.referenceId;
    return this.find(filter, query);
  }

  forStaff(
    staffId: IdLike,
    options: Omit<ActivityQuery, "staffId"> = {},
  ): Promise<HydratedDocument<StaffActivity>[]> {
    return this.list({ ...options, staffId });
  }

  forReference(referenceId: string): Promise<HydratedDocument<StaffActivity>[]> {
    return this.list({ referenceId });
  }
}

export const staffActivityService = new StaffActivityService();
