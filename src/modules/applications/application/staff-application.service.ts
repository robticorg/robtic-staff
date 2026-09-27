import type { Guild, GuildMember } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { applicationEligibilityService } from "../services/application-eligibility.service.ts";
import { applicationPermissionService } from "../services/application-permission.service.ts";
import {
  applicationTicketService,
  type OpenedApplicationTicket,
} from "../services/application-ticket.service.ts";
import { girlVerificationService } from "../services/girl-verification.service.ts";
import { staffRecruitmentService } from "../services/staff-recruitment.service.ts";
import { ApplicationError } from "../shared/application-error.ts";
import type { ApplicationDraft } from "../shared/application-draft.store.ts";
import {
  ApplicantGender,
  ApplicationStatus,
  ApplicationType,
  GirlVerificationStatus,
  type ApplicationDepartment,
} from "../shared/enums.ts";
import { StaffApplicationModel } from "../shared/staff-application.model.ts";

const log = logger.child("applications:apply");

export class StaffApplicationService {
  async submit(
    guild: Guild,
    member: GuildMember,
    draft: ApplicationDraft,
    department: ApplicationDepartment,
  ): Promise<OpenedApplicationTicket> {
    if (draft.type !== ApplicationType.NORMAL_APPLICATION || !draft.gender) {
      throw new ApplicationError(
        "APPLICATION_DRAFT_INCOMPLETE",
        staffApplicationMessages.validation.sessionExpired,
      );
    }
    await applicationEligibilityService.assertCanApply(member);

    const now = new Date();
    const recruiter = await staffRecruitmentService.relationshipForNewApplication(
      guild,
      member.id,
      draft.recruiterStaffId,
      draft.recruiterAssignedAt ?? now,
    );
    const managerRoleIds = await applicationPermissionService.managerRoleIdsFor(guild.id, {
      type: ApplicationType.NORMAL_APPLICATION,
      department,
      gender: draft.gender,
    });
    const isGirl = draft.gender === ApplicantGender.FEMALE;

    const application = await StaffApplicationModel.create({
      guildId: guild.id,
      userId: member.id,
      type: ApplicationType.NORMAL_APPLICATION,
      applicationStatus: ApplicationStatus.PENDING,
      name: draft.name,
      age: draft.age,
      city: draft.city,
      termsAccepted: draft.termsAccepted,
      gender: draft.gender,
      department,
      girlVerification: isGirl ? GirlVerificationStatus.PENDING : null,
      robticJoinedAt: member.joinedAt ?? null,
      ...recruiter,
    });

    let opened: OpenedApplicationTicket;
    try {
      opened = await applicationTicketService.open({ guild, member, application, managerRoleIds });
    } catch (err) {
      await StaffApplicationModel.deleteOne({ applicationId: application.applicationId }).exec();
      throw err;
    }

    if (isGirl) {
      const status = await girlVerificationService.markPending(member);
      if (status === GirlVerificationStatus.VERIFIED) {
        await StaffApplicationModel.updateOne(
          { applicationId: application.applicationId },
          { $set: { girlVerification: status } },
        ).exec();
        await applicationTicketService.refreshPanel(guild, application.applicationId);
      }
    }

    log.info(
      `application ${application.applicationId} (${department}) opened by ${member.id} in ${guild.id}`,
    );
    return opened;
  }
}

export const staffApplicationService = new StaffApplicationService();
