import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import {
  ResponsibilityAssignmentModel,
  type ResponsibilityAssignment,
  type ResponsibilityAssignmentDocument,
} from "../models/responsibility-assignment.model.ts";
import { ResponsibilityAssignmentStatus } from "../types/enums.ts";

const ACTIVE = ResponsibilityAssignmentStatus.ACTIVE;

export class ResponsibilityAssignmentRepository extends BaseRepository<ResponsibilityAssignment> {
  constructor() {
    super(ResponsibilityAssignmentModel);
  }

  byId(guildId: GuildId, assignmentId: string): Promise<ResponsibilityAssignmentDocument | null> {
    return this.findOne({ guildId, assignmentId });
  }

  activeFor(guildId: GuildId, userId: UserId): Promise<ResponsibilityAssignmentDocument[]> {
    return ResponsibilityAssignmentModel.find({ guildId, userId, status: ACTIVE }).sort({ assignedAt: 1 }).exec();
  }

  activeOf(
    guildId: GuildId,
    userId: UserId,
    responsibilityId: string,
  ): Promise<ResponsibilityAssignmentDocument | null> {
    return this.findOne({ guildId, userId, responsibilityId, status: ACTIVE });
  }

  historyFor(guildId: GuildId, userId: UserId): Promise<ResponsibilityAssignmentDocument[]> {
    return ResponsibilityAssignmentModel.find({ guildId, userId }).sort({ assignedAt: -1 }).exec();
  }

  otherActiveWithRole(
    guildId: GuildId,
    userId: UserId,
    roleId: RoleId,
    exceptAssignmentId: string,
  ): Promise<boolean> {
    return this.exists({ guildId, userId, roleId, status: ACTIVE, assignmentId: { $ne: exceptAssignmentId } });
  }

  due(now: Date, limit: number): Promise<ResponsibilityAssignmentDocument[]> {
    return ResponsibilityAssignmentModel.find({ status: ACTIVE, expiresAt: { $ne: null, $lte: now } })
      .sort({ expiresAt: 1 })
      .limit(limit)
      .exec();
  }

  close(
    assignmentId: string,
    status: typeof ResponsibilityAssignmentStatus.REMOVED | typeof ResponsibilityAssignmentStatus.EXPIRED,
    removedBy: UserId,
    at: Date = new Date(),
  ): Promise<ResponsibilityAssignmentDocument | null> {
    return ResponsibilityAssignmentModel.findOneAndUpdate(
      { assignmentId, status: ACTIVE },
      { $set: { status, removedBy, removedAt: at } },
      { returnDocument: "after" },
    ).exec();
  }
}

export const responsibilityAssignmentRepository = new ResponsibilityAssignmentRepository();
