import type { Guild, GuildMember } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { ConflictError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffRecruitmentRules } from "../../../data/staff-application/config.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { getHierarchy, highestLevelFromRoleIds } from "../../configuration/utils/staff-levels.ts";
import { memberIsAdministrator } from "../../tickets/services/ticket-permissions.ts";
import { ApplicationError } from "../shared/application-error.ts";
import {
  StaffApplicationModel,
  type StaffApplicationDocument,
} from "../shared/staff-application.model.ts";

const log = logger.child("applications:recruitment");
const R = staffApplicationMessages.recruiter;

export interface RecruiterTierInput {
  recruiterLevel: number | null;
  minimumTierStart: number | null;
}

export function isEligibleRecruiter(input: RecruiterTierInput): boolean {
  if (input.recruiterLevel === null || input.minimumTierStart === null) return false;
  return input.recruiterLevel >= input.minimumTierStart;
}

export interface RecruiterRelationship {
  recruiterStaffId: UserId | null;
  recruiterAssignedAt?: Date;
  recruiterAssignedBy?: UserId;
}

export interface SetRecruiterInput {
  actor: GuildMember;
  application: StaffApplicationDocument;
  recruiterId: UserId;
  replace: boolean;
}

export type SetRecruiterOutcome = "SAVED" | "REPLACED";

export class StaffRecruitmentService {
  async validateRecruiter(guild: Guild, applicantId: UserId, recruiterId: UserId): Promise<void> {
    if (recruiterId === applicantId) {
      throw new ApplicationError("RECRUITER_SELF", R.self);
    }
    const recruiter = await guild.members
      .fetch({ user: recruiterId, force: true })
      .catch(() => null);
    if (!recruiter) throw new ApplicationError("RECRUITER_NOT_FOUND", R.notFound);
    if (recruiter.user.bot) throw new ApplicationError("RECRUITER_BOT", R.bot);

    const hierarchy = await getHierarchy(guild.id);
    const eligible = isEligibleRecruiter({
      recruiterLevel: highestLevelFromRoleIds(hierarchy, recruiter.roles.cache.keys()),
      minimumTierStart: hierarchy.boundaryLevels[staffRecruitmentRules.recruiterMinimumTier],
    });
    if (!eligible) throw new ApplicationError("RECRUITER_NOT_ELIGIBLE", R.notEligible);
  }

  async existingRelationship(
    guildId: GuildId,
    applicantId: UserId,
  ): Promise<RecruiterRelationship | null> {
    const earliest = await StaffApplicationModel.findOne({
      guildId,
      userId: applicantId,
      recruiterStaffId: { $ne: null },
    })
      .sort({ createdAt: 1 })
      .exec();
    if (!earliest?.recruiterStaffId) return null;
    return {
      recruiterStaffId: earliest.recruiterStaffId,
      recruiterAssignedAt: earliest.recruiterAssignedAt,
      recruiterAssignedBy: earliest.recruiterAssignedBy,
    };
  }

  async relationshipForNewApplication(
    guild: Guild,
    applicantId: UserId,
    selectedId: UserId | null,
    submittedAt: Date,
  ): Promise<RecruiterRelationship> {
    const existing = await this.existingRelationship(guild.id, applicantId);
    if (existing) return existing;
    if (!selectedId) return { recruiterStaffId: null };

    await this.validateRecruiter(guild, applicantId, selectedId);
    return {
      recruiterStaffId: selectedId,
      recruiterAssignedAt: submittedAt,
      recruiterAssignedBy: applicantId,
    };
  }

  async setRecruiter(input: SetRecruiterInput): Promise<SetRecruiterOutcome> {
    const { actor, application, recruiterId, replace } = input;
    const guild = actor.guild;
    await this.validateRecruiter(guild, application.userId, recruiterId);

    const current =
      application.recruiterStaffId ??
      (await this.existingRelationship(guild.id, application.userId))?.recruiterStaffId ??
      null;

    if (current && !replace) throw new ConflictError(R.alreadySet(current));
    if (current && !memberIsAdministrator(actor)) {
      throw new ApplicationError("RECRUITER_REPLACE_ADMIN_ONLY", R.replaceAdminOnly);
    }

    const now = new Date();
    const fields = {
      recruiterStaffId: recruiterId,
      recruiterAssignedAt: now,
      recruiterAssignedBy: actor.id,
    };

    if (!current) {
      const saved = await StaffApplicationModel.findOneAndUpdate(
        { applicationId: application.applicationId, recruiterStaffId: null },
        { $set: fields },
        { returnDocument: "after" },
      ).exec();
      if (!saved) {
        const fresh = await StaffApplicationModel.findOne({
          applicationId: application.applicationId,
        }).exec();
        throw new ConflictError(R.alreadySet(fresh?.recruiterStaffId ?? recruiterId));
      }
      log.info(`recruiter of ${application.userId} set to ${recruiterId} by ${actor.id}`);
      return "SAVED";
    }

    await StaffApplicationModel.updateMany(
      { guildId: guild.id, userId: application.userId, recruiterStaffId: current },
      {
        $set: fields,
        $push: {
          recruiterReplacements: {
            previousRecruiterStaffId: current,
            replacedBy: actor.id,
            replacedAt: now,
          },
        },
      },
    ).exec();
    await StaffApplicationModel.updateOne(
      { applicationId: application.applicationId, recruiterStaffId: null },
      { $set: fields },
    ).exec();
    log.info(
      `recruiter of ${application.userId} replaced ${current} → ${recruiterId} by ${actor.id}`,
    );
    return "REPLACED";
  }
}

export const staffRecruitmentService = new StaffRecruitmentService();
