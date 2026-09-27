import type { GuildMember } from "discord.js";
import type { UserId } from "../../../shared/types/index.ts";
import { ConflictError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { limits } from "../../../data/config/limits.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import {
  resolveAcceptRequest,
  isEmptyAcceptRequest,
  type AcceptRequest,
} from "../../staff/services/staff-accept-request.ts";
import {
  memberActor,
  staffManagementService,
  type AcceptResult,
} from "../../staff/services/staff-management.service.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import type { StaffType } from "../../staff/types/enums.ts";
import { buildTicketNotice } from "../../tickets/render/notice.ts";
import { ApplicationError } from "../shared/application-error.ts";
import {
  ApplicationStatus,
  ApplicationType,
  OPEN_APPLICATION_STATUSES,
} from "../shared/enums.ts";
import {
  StaffApplicationModel,
  type StaffApplicationDocument,
} from "../shared/staff-application.model.ts";
import type { ApplicationContext } from "./application-context.service.ts";
import { applicationPermissionService } from "./application-permission.service.ts";
import { applicationTicketService } from "./application-ticket.service.ts";

const log = logger.child("applications:decision");
const D = staffApplicationMessages.decision;

export interface ApplicationAcceptOutcome {
  applicantId: UserId;
  result: AcceptResult;
}

export class ApplicationDecisionService {
  async accept(
    actor: GuildMember,
    ctx: ApplicationContext,
    request: AcceptRequest | null,
  ): Promise<ApplicationAcceptOutcome> {
    const { ticket, application } = ctx;
    applicationPermissionService.authorizeDecision(actor, ticket, application);
    this.assertOpen(application);

    const applicant = await actor.guild.members
      .fetch({ user: application.userId, force: true })
      .catch(() => null);
    if (!applicant) throw new ApplicationError("APPLICATION_APPLICANT_GONE", D.applicantGone);
    if (await staffPermissionService.isStaff(applicant)) {
      throw new ApplicationError("APPLICATION_ALREADY_STAFF", D.alreadyStaff(applicant.id));
    }

    const isTransfer = application.type === ApplicationType.TRANSFER_APPLICATION;
    if (isTransfer && application.evaluation && !application.evaluation.eligible) {
      throw new ApplicationError("TRANSFER_INELIGIBLE", D.ineligible);
    }

    let level: number | null = null;
    let staffType: StaffType | null = null;
    if (request && !isEmptyAcceptRequest(request)) {
      const resolved = await resolveAcceptRequest(actor.guild.id, request);
      level = resolved.level;
      staffType = resolved.staffType;
    }
    if (level === null && isTransfer) {
      level = application.evaluation?.proposedStaffLevel ?? null;
      if (level === null) throw new ApplicationError("TRANSFER_NO_PROPOSAL", D.noProposal);
    }

    const previous = application.applicationStatus;
    const decided = await this.claim(application, {
      applicationStatus: ApplicationStatus.ACCEPTED,
      acceptedBy: actor.id,
      acceptedAt: new Date(),
      acceptedLevel: level ?? 0,
    });

    let result: AcceptResult;
    try {
      result = await staffManagementService.accept(
        applicant,
        memberActor(actor),
        level,
        staffType,
        {
          source: application.type,
          applicationId: application.applicationId,
          ticketId: ticket.ticketId,
          recruiterStaffId: application.recruiterStaffId,
        },
        { managerRoleIds: applicationPermissionService.managerRoleIds(ticket) },
      );
    } catch (err) {
      await StaffApplicationModel.updateOne(
        { applicationId: decided.applicationId },
        {
          $set: { applicationStatus: previous },
          $unset: { acceptedBy: "", acceptedAt: "", acceptedLevel: "" },
        },
      ).exec();
      throw err;
    }

    await StaffApplicationModel.updateOne(
      { applicationId: decided.applicationId },
      { $set: { acceptedLevel: result.level } },
    ).exec();
    await this.announce(actor, ticket.channelId, D.acceptedNotice(applicant.id, result.level), "success");
    await applicationTicketService.refreshPanel(actor.guild, decided.applicationId);

    log.info(
      `application ${decided.applicationId}: ${applicant.id} accepted at ${result.level} by ${actor.id}`,
    );
    return { applicantId: applicant.id, result };
  }

  async refuse(actor: GuildMember, ctx: ApplicationContext, rawReason: string): Promise<void> {
    const { ticket, application } = ctx;
    applicationPermissionService.authorizeDecision(actor, ticket, application);
    this.assertOpen(application);

    const reason = rawReason.trim().slice(0, limits.reasonMaxLength);
    if (!reason) throw new ApplicationError("APPLICATION_REFUSE_REASON", D.refuseUsage);

    const decided = await this.claim(application, {
      applicationStatus: ApplicationStatus.REJECTED,
      rejectedBy: actor.id,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    await this.announce(actor, ticket.channelId, D.refusedNotice(reason), "error");
    await applicationTicketService.refreshPanel(actor.guild, decided.applicationId);
    log.info(`application ${decided.applicationId} refused by ${actor.id}`);
  }

  private assertOpen(application: StaffApplicationDocument): void {
    if (!OPEN_APPLICATION_STATUSES.includes(application.applicationStatus)) {
      throw new ConflictError(D.alreadyDecided);
    }
  }

  private async claim(
    application: StaffApplicationDocument,
    fields: Record<string, unknown>,
  ): Promise<StaffApplicationDocument> {
    const decided = await StaffApplicationModel.findOneAndUpdate(
      {
        applicationId: application.applicationId,
        applicationStatus: { $in: [...OPEN_APPLICATION_STATUSES] },
      },
      { $set: fields },
      { returnDocument: "after" },
    ).exec();
    if (!decided) throw new ConflictError(D.alreadyDecided);
    return decided;
  }

  private async announce(
    actor: GuildMember,
    channelId: string,
    line: string,
    tone: "success" | "error",
  ): Promise<void> {
    const channel = await actor.guild.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased() && "send" in channel) {
      await channel.send(buildTicketNotice([line], { tone })).catch(() => undefined);
    }
  }
}

export const applicationDecisionService = new ApplicationDecisionService();
