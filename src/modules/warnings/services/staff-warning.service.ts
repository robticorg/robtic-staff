import type { HydratedDocument, Types } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, ListOptions, MongoFilter, UserId } from "../../../shared/types/index.ts";
import { NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { StaffWarningModel, type StaffWarning } from "../models/staff-warning.model.ts";
import {
  STAFF_WARNING_LEVEL_VALUES,
  StaffWarningType,
  VERBAL_WARNINGS_PER_REAL,
  WarningStatus,
  type StaffWarningLevel,
  type StaffWarningRealSource,
} from "../types/enums.ts";

type Doc = HydratedDocument<StaffWarning>;

export interface IssueVerbalInput {
  guildId: GuildId;
  staffId: IdLike;
  reason: string;
  issuedBy: UserId;
  evidence?: string[];
}

export interface IssueRealInput {
  guildId: GuildId;
  staffId: IdLike;
  level: StaffWarningLevel;
  reason: string;
  issuedBy: UserId;
  evidence?: string[];
  source: StaffWarningRealSource;
  sourceVerbalWarningIds?: Types.ObjectId[];
}

export interface RemoveStaffWarningInput {
  warningId: IdLike;
  removedBy: UserId;
  removalReason?: string;
  status?: WarningStatus;
}

function warningTypeOf(doc: Pick<StaffWarning, "type">): StaffWarningType {
  return doc.type ?? StaffWarningType.REAL;
}

export class StaffWarningService extends BaseRepository<StaffWarning> {
  constructor() {
    super(StaffWarningModel);
  }

  issueVerbal(input: IssueVerbalInput): Promise<Doc> {
    if (!input.reason?.trim()) throw new ValidationError("لازم تكتب سبب للتحذير");
    if (!input.issuedBy) throw new ValidationError("issuedBy is required");
    return this.insert({
      guildId: input.guildId,
      staffId: toObjectId(input.staffId),
      type: StaffWarningType.VERBAL,
      reason: input.reason.trim(),
      issuedBy: input.issuedBy,
      evidence: input.evidence ?? [],
      status: WarningStatus.ACTIVE,
    });
  }

  issueReal(input: IssueRealInput): Promise<Doc> {
    if (!STAFF_WARNING_LEVEL_VALUES.includes(input.level)) {
      throw new ValidationError("مستوى التحذير الرسمي لازم يكون 1 أو 2 أو 3", { level: input.level });
    }
    if (!input.reason?.trim()) throw new ValidationError("لازم تكتب سبب للتحذير");
    return this.insert({
      guildId: input.guildId,
      staffId: toObjectId(input.staffId),
      type: StaffWarningType.REAL,
      level: input.level,
      reason: input.reason.trim(),
      issuedBy: input.issuedBy,
      evidence: input.evidence ?? [],
      status: WarningStatus.ACTIVE,
      source: input.source,
      sourceVerbalWarningIds: input.sourceVerbalWarningIds,
    });
  }

  listForStaff(
    staffId: IdLike,
    options: ListOptions & { status?: WarningStatus; type?: StaffWarningType } = {},
  ): Promise<Doc[]> {
    const filter: MongoFilter<StaffWarning> = { staffId: toObjectId(staffId) };
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;
    return this.find(filter, options);
  }

  activeForStaff(staffId: IdLike): Promise<Doc[]> {
    return this.listForStaff(staffId, { status: WarningStatus.ACTIVE });
  }

  countActiveVerbal(staffId: IdLike): Promise<number> {
    return this.count({
      staffId: toObjectId(staffId),
      type: StaffWarningType.VERBAL,
      status: WarningStatus.ACTIVE,
    });
  }

  countConvertedVerbal(staffId: IdLike): Promise<number> {
    return this.count({
      staffId: toObjectId(staffId),
      type: StaffWarningType.VERBAL,
      status: WarningStatus.CONVERTED,
    });
  }

  activeRealForStaff(staffId: IdLike): Promise<Doc[]> {
    return this.model
      .find({
        staffId: toObjectId(staffId),
        type: StaffWarningType.REAL,
        status: WarningStatus.ACTIVE,
      })
      .sort({ level: 1, createdAt: 1 })
      .exec();
  }

  async currentRealLevel(staffId: IdLike): Promise<number> {
    const rows = await this.model
      .find({
        staffId: toObjectId(staffId),
        type: StaffWarningType.REAL,
        status: WarningStatus.ACTIVE,
      })
      .select({ level: 1 })
      .exec();
    let highest = 0;
    for (const r of rows) if ((r.level ?? 0) > highest) highest = r.level ?? 0;
    return highest;
  }

  async claimVerbalTriplet(staffId: IdLike): Promise<Types.ObjectId[] | null> {
    const staff = toObjectId(staffId);
    const candidates = await this.model
      .find({ staffId: staff, type: StaffWarningType.VERBAL, status: WarningStatus.ACTIVE })
      .sort({ createdAt: 1 })
      .limit(VERBAL_WARNINGS_PER_REAL)
      .select({ _id: 1 })
      .exec();
    if (candidates.length < VERBAL_WARNINGS_PER_REAL) return null;

    const ids = candidates.map((c) => c._id as Types.ObjectId);
    const res = await this.model
      .updateMany(
        { _id: { $in: ids }, status: WarningStatus.ACTIVE },
        { $set: { status: WarningStatus.CONVERTED } },
      )
      .exec();

    if (res.modifiedCount !== VERBAL_WARNINGS_PER_REAL) {
      await this.model
        .updateMany(
          { _id: { $in: ids }, status: WarningStatus.CONVERTED, convertedToWarningId: { $exists: false } },
          { $set: { status: WarningStatus.ACTIVE } },
        )
        .exec();
      return null;
    }
    return ids;
  }

  async linkConverted(verbalIds: Types.ObjectId[], realWarningId: Types.ObjectId): Promise<void> {
    await this.model
      .updateMany(
        { _id: { $in: verbalIds } },
        { $set: { convertedToWarningId: realWarningId } },
      )
      .exec();
  }

  async remove(input: RemoveStaffWarningInput): Promise<Doc> {
    const updated = await this.updateById(input.warningId, {
      $set: {
        status: input.status ?? WarningStatus.REMOVED,
        removedAt: new Date(),
        removedBy: input.removedBy,
        removalReason: input.removalReason,
      },
    });
    if (!updated) throw new NotFoundError("staff warning", { warningId: String(input.warningId) });
    return updated;
  }
}

export { warningTypeOf };
export const staffWarningService = new StaffWarningService();
