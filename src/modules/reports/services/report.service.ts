import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, ListOptions, MongoFilter, UserId } from "../../../shared/types/index.ts";
import { NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { ReportModel, type Report } from "../models/report.model.ts";
import { REPORT_TYPE_VALUES, ReportStatus, type ReportType } from "../types/enums.ts";

export interface CreateReportInput {
  guildId: GuildId;
  type: ReportType;
  reporterId: UserId;
  reportedUserId: UserId;
}

export interface ReportQuery extends ListOptions {
  guildId?: GuildId;
  status?: ReportStatus;
  type?: ReportType;
  reportedUserId?: UserId;
  claimedBy?: IdLike;
}

export class ReportService extends BaseRepository<Report> {
  constructor() {
    super(ReportModel);
  }

  create(input: CreateReportInput): Promise<HydratedDocument<Report>> {
    if (!REPORT_TYPE_VALUES.includes(input.type)) {
      throw new ValidationError("Unknown report type", { type: input.type });
    }
    if (!input.guildId || !input.reporterId || !input.reportedUserId) {
      throw new ValidationError("guildId, reporterId and reportedUserId are required");
    }
    return this.insert({
      guildId: input.guildId,
      type: input.type,
      reporterId: input.reporterId,
      reportedUserId: input.reportedUserId,
      status: ReportStatus.PENDING,
    });
  }

  getByReportId(reportId: string): Promise<HydratedDocument<Report> | null> {
    return this.findOne({ reportId });
  }

  async getByReportIdOrThrow(reportId: string): Promise<HydratedDocument<Report>> {
    const report = await this.getByReportId(reportId);
    if (!report) throw new NotFoundError("report", { reportId });
    return report;
  }

  list(query: ReportQuery = {}): Promise<HydratedDocument<Report>[]> {
    const filter: MongoFilter<Report> = {};
    if (query.guildId) filter.guildId = query.guildId;
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.reportedUserId) filter.reportedUserId = query.reportedUserId;
    if (query.claimedBy) filter.claimedBy = toObjectId(query.claimedBy);
    return this.find(filter, query);
  }

  claim(reportId: string, staffId: IdLike): Promise<HydratedDocument<Report> | null> {
    return this.updateOne(
      { reportId, status: ReportStatus.PENDING },
      {
        $set: {
          claimedBy: toObjectId(staffId),
          status: ReportStatus.CLAIMED,
          claimedAt: new Date(),
        },
      },
    );
  }

  setStatus(reportId: string, status: ReportStatus): Promise<HydratedDocument<Report> | null> {
    const patch: Record<string, unknown> = { status };
    if (
      status === ReportStatus.ACCEPTED ||
      status === ReportStatus.REJECTED ||
      status === ReportStatus.CLOSED
    ) {
      patch.completedAt = new Date();
    }
    return this.updateOne({ reportId }, { $set: patch });
  }
}

export const reportService = new ReportService();
