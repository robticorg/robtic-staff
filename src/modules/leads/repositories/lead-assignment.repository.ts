import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import {
  LeadAssignmentModel,
  type LeadAssignment,
  type LeadAssignmentDocument,
} from "../models/lead-assignment.model.ts";
import { LeadAssignmentStatus } from "../types/enums.ts";

export class LeadAssignmentRepository extends BaseRepository<LeadAssignment> {
  constructor() {
    super(LeadAssignmentModel);
  }

  active(guildId: GuildId, leadId: string): Promise<LeadAssignmentDocument | null> {
    return this.findOne({ guildId, leadId, status: LeadAssignmentStatus.ACTIVE });
  }

  activeForGuild(guildId: GuildId): Promise<LeadAssignmentDocument[]> {
    return LeadAssignmentModel.find({ guildId, status: LeadAssignmentStatus.ACTIVE }).exec();
  }

  history(guildId: GuildId, leadId: string, limit: number): Promise<LeadAssignmentDocument[]> {
    return LeadAssignmentModel.find({ guildId, leadId }).sort({ assignedAt: -1 }).limit(limit).exec();
  }

  close(
    assignmentId: string,
    status: typeof LeadAssignmentStatus.REPLACED | typeof LeadAssignmentStatus.REMOVED,
    removedBy: UserId,
    at: Date = new Date(),
  ): Promise<LeadAssignmentDocument | null> {
    return LeadAssignmentModel.findOneAndUpdate(
      { assignmentId, status: LeadAssignmentStatus.ACTIVE },
      { $set: { status, removedBy, removedAt: at } },
      { returnDocument: "after" },
    ).exec();
  }
}

export const leadAssignmentRepository = new LeadAssignmentRepository();
