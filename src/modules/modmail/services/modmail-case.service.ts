import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, MongoFilter, UserId } from "../../../shared/types/index.ts";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { nextSequence } from "../models/counter.model.ts";
import { ModmailCaseModel, type ModmailCase } from "../models/modmail-case.model.ts";
import {
  MODMAIL_CASE_TYPE_VALUES,
  ModmailCaseStatus,
  OPEN_CASE_STATUSES,
  type ModmailCaseStatus as CaseStatus,
  type ModmailCaseType,
} from "../types/enums.ts";
import { assertTransition } from "../types/transitions.ts";
import { appData } from "../../../data/config/index.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";

const CASE_ID_PREFIX = process.env.MODMAIL_CASE_PREFIX ?? appData.caseIdPrefix;

export interface CreateCaseInput {
  guildId: GuildId;
  userId: UserId;
  type: ModmailCaseType;
  reportedUserId: UserId;
  reason: string;
  description: string;
  evidenceCount?: number;
  metadata?: Record<string, unknown>;
}

export interface StatusChangeExtra {
  claimedByDiscordId?: UserId;
  closedByDiscordId?: UserId;
  resolutionNote?: string;
}

export class ModmailCaseService extends BaseRepository<ModmailCase> {
  constructor() {
    super(ModmailCaseModel);
  }

  async nextCaseId(guildId: GuildId): Promise<string> {
    const seq = await nextSequence(`modmail:${guildId}`);
    return `${CASE_ID_PREFIX}${seq}`;
  }

  async create(input: CreateCaseInput): Promise<HydratedDocument<ModmailCase>> {
    if (!MODMAIL_CASE_TYPE_VALUES.includes(input.type)) {
      throw new ValidationError(modmailMessages.errors.unknownReportType, { type: input.type });
    }
    if (!input.reason?.trim()) throw new ValidationError(modmailMessages.errors.reasonRequired);
    if (!input.description?.trim()) {
      throw new ValidationError(modmailMessages.errors.descriptionRequired);
    }
    if (input.userId === input.reportedUserId) {
      throw new ValidationError(modmailMessages.errors.cannotReportSelf);
    }

    const caseId = await this.nextCaseId(input.guildId);
    return this.insert({
      caseId,
      guildId: input.guildId,
      userId: input.userId,
      type: input.type,
      reportedUserId: input.reportedUserId,
      reason: input.reason.trim(),
      description: input.description.trim(),
      evidenceCount: input.evidenceCount ?? 0,
      status: ModmailCaseStatus.PENDING,
      metadata: input.metadata,
    });
  }

  getByCaseId(caseId: string): Promise<HydratedDocument<ModmailCase> | null> {
    return this.findOne({ caseId });
  }

  async getByCaseIdOrThrow(caseId: string): Promise<HydratedDocument<ModmailCase>> {
    const found = await this.getByCaseId(caseId);
    if (!found) throw new NotFoundError("modmail case", { caseId });
    return found;
  }

  getByThreadId(threadId: string): Promise<HydratedDocument<ModmailCase> | null> {
    return this.findOne({ threadId });
  }

  getOpenCasesForUser(
    guildId: GuildId,
    userId: UserId,
  ): Promise<HydratedDocument<ModmailCase>[]> {
    return this.model
      .find({ guildId, userId, status: { $in: OPEN_CASE_STATUSES as CaseStatus[] } })
      .sort({ createdAt: -1 })
      .exec();
  }

  listQueue(
    guildId: GuildId,
    status?: CaseStatus,
  ): Promise<HydratedDocument<ModmailCase>[]> {
    const filter: MongoFilter<ModmailCase> = { guildId };
    if (status) filter.status = status;
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  attachThread(
    caseId: string,
    refs: { threadId: string; reportMessageId: string },
  ): Promise<HydratedDocument<ModmailCase> | null> {
    return this.updateOne({ caseId }, { $set: refs });
  }

  setEvidenceCount(caseId: string, count: number): Promise<HydratedDocument<ModmailCase> | null> {
    return this.updateOne({ caseId }, { $set: { evidenceCount: Math.max(0, count) } });
  }

  incEvidenceCount(caseId: string, by = 1): Promise<HydratedDocument<ModmailCase> | null> {
    return this.updateOne({ caseId }, { $inc: { evidenceCount: by } });
  }

  async claimAtomic(
    caseId: string,
    staffId: IdLike,
    staffDiscordId: UserId,
  ): Promise<HydratedDocument<ModmailCase> | null> {
    assertTransition(ModmailCaseStatus.PENDING, ModmailCaseStatus.CLAIMED);
    return this.model
      .findOneAndUpdate(
        { caseId, status: ModmailCaseStatus.PENDING, claimedBy: { $exists: false } },
        {
          $set: {
            claimedBy: toObjectId(staffId),
            claimedByDiscordId: staffDiscordId,
            status: ModmailCaseStatus.CLAIMED,
            claimedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      )
      .exec();
  }

  async changeStatus(
    caseId: string,
    to: CaseStatus,
    extra: StatusChangeExtra = {},
  ): Promise<HydratedDocument<ModmailCase>> {
    const current = await this.getByCaseIdOrThrow(caseId);
    assertTransition(current.status, to);

    const set: Record<string, unknown> = { status: to };
    if (to === ModmailCaseStatus.RESOLVED) set.resolvedAt = new Date();
    if (to === ModmailCaseStatus.CLOSED) {
      set.closedAt = new Date();
      if (extra.closedByDiscordId) set.closedByDiscordId = extra.closedByDiscordId;
    }
    if (extra.resolutionNote) set.resolutionNote = extra.resolutionNote;

    const updated = await this.model
      .findOneAndUpdate({ caseId, status: current.status }, { $set: set }, { returnDocument: "after" })
      .exec();
    if (!updated) {
      throw new ConflictError(modmailMessages.errors.stateChangedRetry, { caseId, to });
    }
    return updated;
  }

  isOpen(status: CaseStatus): boolean {
    return (OPEN_CASE_STATUSES as CaseStatus[]).includes(status);
  }

  attachResolution(
    caseId: string,
    resolution: { resolutionType: string; punishmentId: string; resolvedBy: UserId },
  ): Promise<HydratedDocument<ModmailCase> | null> {
    return this.updateOne(
      { caseId },
      { $set: { ...resolution, resolvedAt: new Date() } },
    );
  }
}

export const modmailCaseService = new ModmailCaseService();
