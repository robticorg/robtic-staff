import type { Guild, GuildMember } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { getHierarchy } from "../../configuration/utils/staff-levels.ts";
import { applicationEligibilityService } from "../services/application-eligibility.service.ts";
import { applicationPermissionService } from "../services/application-permission.service.ts";
import {
  applicationTicketService,
  type OpenedApplicationTicket,
} from "../services/application-ticket.service.ts";
import { staffRecruitmentService } from "../services/staff-recruitment.service.ts";
import { ApplicationError } from "../shared/application-error.ts";
import { parseWholeNumber } from "../shared/applicant-input.ts";
import type { ApplicationDraft, TransferDraftInput } from "../shared/application-draft.store.ts";
import { ApplicationStatus, ApplicationType } from "../shared/enums.ts";
import {
  StaffApplicationModel,
  type TransferSource,
} from "../shared/staff-application.model.ts";
import { staffTransferEvaluationService } from "./staff-transfer-evaluation.service.ts";
import {
  transferEvidenceService,
  type UploadedEvidence,
} from "./transfer-evidence.service.ts";

const log = logger.child("applications:transfer");
const T = staffApplicationMessages.transfer;

export interface TransferInfoInput {
  memberCount: string;
  onlineCount: string;
  roleOrder: string;
  invite: string;
}

export type TransferInfoProblem = "COUNT" | "ONLINE_ABOVE_MEMBERS" | "ROLE_ORDER";

export function parseTransferInfo(
  input: TransferInfoInput,
): { ok: true; value: TransferDraftInput } | { ok: false; problem: TransferInfoProblem } {
  const roleOrder = parseWholeNumber(input.roleOrder);
  if (roleOrder === null || roleOrder < 1) return { ok: false, problem: "ROLE_ORDER" };

  const memberCount = parseWholeNumber(input.memberCount);
  const onlineCount = parseWholeNumber(input.onlineCount);
  if (memberCount === null || onlineCount === null) return { ok: false, problem: "COUNT" };
  if (onlineCount > memberCount) return { ok: false, problem: "ONLINE_ABOVE_MEMBERS" };

  const invite = input.invite.trim();
  return { ok: true, value: { memberCount, onlineCount, roleOrder, invite: invite || null } };
}

interface VerifiedServer {
  serverId: string;
  serverName: string;
  memberCount: number;
  onlineCount: number | null;
}

export class StaffTransferApplicationService {
  readInfo(input: TransferInfoInput): TransferDraftInput {
    const parsed = parseTransferInfo(input);
    if (parsed.ok) return parsed.value;
    if (parsed.problem === "ROLE_ORDER") {
      throw new ApplicationError("TRANSFER_ROLE_ORDER", T.roleOrderNotNumber);
    }
    if (parsed.problem === "ONLINE_ABOVE_MEMBERS") {
      throw new ApplicationError("TRANSFER_ONLINE_ABOVE", T.onlineAboveMembers);
    }
    throw new ApplicationError("TRANSFER_COUNT", T.countInvalid);
  }

  async verifyInvite(guild: Guild, invite: string | null): Promise<VerifiedServer | null> {
    if (!invite) return null;
    const resolved = await guild.client.fetchInvite(invite).catch(() => null);
    if (!resolved?.guild || resolved.memberCount === null) {
      throw new ApplicationError("TRANSFER_INVITE_INVALID", T.inviteInvalid);
    }
    if (resolved.guild.id === guild.id) {
      throw new ApplicationError("TRANSFER_INVITE_HOME", T.inviteIsHome);
    }
    return {
      serverId: resolved.guild.id,
      serverName: resolved.guild.name,
      memberCount: resolved.memberCount,
      onlineCount: resolved.presenceCount,
    };
  }

  async submit(
    guild: Guild,
    member: GuildMember,
    draft: ApplicationDraft,
    uploads: readonly UploadedEvidence[],
  ): Promise<OpenedApplicationTicket> {
    const info = draft.transfer;
    if (draft.type !== ApplicationType.TRANSFER_APPLICATION || !info) {
      throw new ApplicationError(
        "TRANSFER_DRAFT_INCOMPLETE",
        staffApplicationMessages.validation.sessionExpired,
      );
    }
    await applicationEligibilityService.assertCanApply(member);
    transferEvidenceService.assertValid(uploads);

    const now = new Date();
    const recruiter = await staffRecruitmentService.relationshipForNewApplication(
      guild,
      member.id,
      draft.recruiterStaffId,
      draft.recruiterAssignedAt ?? now,
    );
    const managerRoleIds = await applicationPermissionService.managerRoleIdsFor(guild.id, {
      type: ApplicationType.TRANSFER_APPLICATION,
      department: null,
      gender: null,
    });

    const verified = await this.verifyInvite(guild, info.invite);
    const source: TransferSource = {
      sourceServerId: verified?.serverId ?? null,
      sourceServerName: verified?.serverName ?? null,
      sourceServerMemberCount: verified?.memberCount ?? info.memberCount,
      sourceServerOnlineCount: verified?.onlineCount ?? info.onlineCount,
      sourceRoleOrder: info.roleOrder,
      sourceRoleName: null,
      sourceRoleId: null,
      countsVerified: !!verified,
    };

    const fresh = await guild.members.fetch({ user: member.id, force: true }).catch(() => member);
    const evaluation = staffTransferEvaluationService.evaluate(
      {
        sourceMemberCount: source.sourceServerMemberCount,
        sourceOnlineCount: source.sourceServerOnlineCount,
        sourceRoleOrder: source.sourceRoleOrder,
        membershipDays: staffTransferEvaluationService.membershipDays(fresh.joinedAt, now),
      },
      await getHierarchy(guild.id),
    );

    const files = await transferEvidenceService.download(uploads);

    const application = await StaffApplicationModel.create({
      guildId: guild.id,
      userId: member.id,
      type: ApplicationType.TRANSFER_APPLICATION,
      applicationStatus: ApplicationStatus.PENDING,
      name: draft.name,
      age: draft.age,
      city: draft.city,
      termsAccepted: draft.termsAccepted,
      transfer: source,
      evaluation: {
        eligible: evaluation.eligible,
        ineligibleReasons: [...evaluation.ineligibleReasons],
        sourceTier: evaluation.sourceTier,
        proposedTier: evaluation.proposedTier,
        proposedStaffLevel: evaluation.proposedStaffLevel,
        proposedStaffRoleId: evaluation.proposedStaffRoleId,
      },
      robticJoinedAt: fresh.joinedAt ?? null,
      ...recruiter,
    });

    let opened: OpenedApplicationTicket;
    try {
      const count = await transferEvidenceService.save(
        guild.id,
        application.applicationId,
        member.id,
        files,
      );
      application.evidenceCount = count;
      await StaffApplicationModel.updateOne(
        { applicationId: application.applicationId },
        { $set: { evidenceCount: count } },
      ).exec();
      opened = await applicationTicketService.open({ guild, member: fresh, application, managerRoleIds });
    } catch (err) {
      await transferEvidenceService.deleteFor(application.applicationId);
      await StaffApplicationModel.deleteOne({ applicationId: application.applicationId }).exec();
      throw err;
    }

    log.info(
      `transfer ${application.applicationId} opened by ${member.id} in ${guild.id} ` +
        `(eligible ${evaluation.eligible}, proposed ${evaluation.proposedStaffLevel})`,
    );
    return opened;
  }
}

export const staffTransferApplicationService = new StaffTransferApplicationService();
