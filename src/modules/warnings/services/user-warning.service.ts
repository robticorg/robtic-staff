import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, ListOptions, MongoFilter, UserId } from "../../../shared/types/index.ts";
import { NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { UserWarningModel, type UserWarning } from "../models/user-warning.model.ts";
import { WarningSource, WarningStatus } from "../types/enums.ts";

export interface IssueUserWarningInput {
  userId: UserId;
  guildId: GuildId;
  reason: string;
  issuedBy: UserId;
  evidence?: string[];

  source?: WarningSource;
  reportId?: string;
}

export interface RevokeUserWarningInput {
  warningId: IdLike;
  revokedBy: UserId;
  revokeReason?: string;
}

export class UserWarningService extends BaseRepository<UserWarning> {
  constructor() {
    super(UserWarningModel);
  }

  issue(input: IssueUserWarningInput): Promise<HydratedDocument<UserWarning>> {
    if (!input.userId || !input.guildId) {
      throw new ValidationError("userId and guildId are required");
    }
    if (!input.reason?.trim()) throw new ValidationError("A warning reason is required");
    if (!input.issuedBy) throw new ValidationError("issuedBy is required");

    const source = input.source ?? WarningSource.DIRECT;
    if (source === WarningSource.REPORT && !input.reportId) {
      throw new ValidationError("reportId is required when source is REPORT");
    }

    return this.insert({
      userId: input.userId,
      guildId: input.guildId,
      reason: input.reason.trim(),
      issuedBy: input.issuedBy,
      evidence: input.evidence ?? [],
      source,
      reportId: source === WarningSource.REPORT ? input.reportId : undefined,
      status: WarningStatus.ACTIVE,
    });
  }

  listForUser(
    guildId: GuildId,
    userId: UserId,
    options: ListOptions & { status?: WarningStatus; source?: WarningSource } = {},
  ): Promise<HydratedDocument<UserWarning>[]> {
    const filter: MongoFilter<UserWarning> = { guildId, userId };
    if (options.status) filter.status = options.status;
    if (options.source) filter.source = options.source;
    return this.find(filter, options);
  }

  activeForUser(guildId: GuildId, userId: UserId): Promise<HydratedDocument<UserWarning>[]> {
    return this.listForUser(guildId, userId, { status: WarningStatus.ACTIVE });
  }

  countActive(guildId: GuildId, userId: UserId): Promise<number> {
    return this.count({ guildId, userId, status: WarningStatus.ACTIVE });
  }

  listFromReport(reportId: string): Promise<HydratedDocument<UserWarning>[]> {
    return this.find({ reportId, source: WarningSource.REPORT });
  }

  async revoke(input: RevokeUserWarningInput): Promise<HydratedDocument<UserWarning>> {
    const updated = await this.updateById(input.warningId, {
      $set: {
        status: WarningStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: input.revokedBy,
        revokeReason: input.revokeReason,
      },
    });
    if (!updated) throw new NotFoundError("user warning", { warningId: String(input.warningId) });
    return updated;
  }
}

export const userWarningService = new UserWarningService();
