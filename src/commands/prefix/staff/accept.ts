import { definePrefixCommand, type PrefixContext } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import type { StaffTier } from "../../../modules/configuration/types/enums.ts";
import {
  applicationContextService,
  type ApplicationContext,
} from "../../../modules/applications/services/application-context.service.ts";
import { applicationDecisionService } from "../../../modules/applications/services/application-decision.service.ts";
import {
  acceptRequestFromArgs,
  isEmptyAcceptRequest,
  resolveAcceptRequest,
} from "../../../modules/staff/services/staff-accept-request.ts";
import {
  memberActor,
  staffManagementService,
  type AcceptResult,
} from "../../../modules/staff/services/staff-management.service.ts";
import { staffService } from "../../../modules/staff/services/staff.service.ts";
import { StaffStatus } from "../../../modules/staff/types/enums.ts";
import { hiddenStaffMessages } from "../../../data/hidden-staff/messages.ts";
import { hiddenStaffService } from "../../../modules/staff/hidden/index.ts";
import { PrefixAbort, requireApplyManager } from "../_shared/guards.ts";
import { splitHiddenMode } from "../_shared/hidden-mode.ts";
import {
  ResponsibilityDecision,
  responsibilityDecisionService,
} from "../../../modules/tickets/responsibility-apply/decision.service.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetMember } from "../_shared/target.ts";

const M = prefixMessages.staff;

function acceptedReply(targetId: string, result: AcceptResult, tier: StaffTier | null): string {
  const line = acceptedLine(targetId, result, tier);
  if (!result.awaitingIdentity) return line;
  return `${line}\n${serverTagMessages.notice.awaitingIdentity(targetId, result.awaitingIdentity.dmSent)}`;
}

function acceptedLine(targetId: string, result: AcceptResult, tier: StaffTier | null): string {
  const mention = `<@${targetId}>`;
  const tierLabel = tier ? STAFF_TIER_LABELS[tier] : null;

  if (tierLabel && result.staffType) {
    return M.acceptedWithTierAndType(
      mention,
      result.level,
      tierLabel,
      staffTypeLabel(result.staffType),
    );
  }
  if (tierLabel) return M.acceptedWithTier(mention, result.level, tierLabel);
  if (result.staffType) {
    return M.acceptedWithType(mention, result.level, staffTypeLabel(result.staffType));
  }
  return M.accepted(mention, result.level);
}

async function acceptInApplication(
  ctx: PrefixContext,
  application: ApplicationContext,
  args: readonly string[],
  hidden: boolean,
) {
  const applicantId = application.application.userId;
  const named = [...ctx.mentionedUsers.map((u) => u.id), ...extractUserIds(args)];
  if (named.some((id) => id !== applicantId)) {
    throw new PrefixAbort(staffApplicationMessages.decision.wrongTarget(applicantId));
  }

  const applicant = hidden ? await ctx.guild.members.fetch(applicantId).catch(() => null) : null;
  if (hidden) {
    if (!applicant) throw new PrefixAbort(M.memberNotFound);
    await hiddenStaffService.assertCanAccept(ctx.member, applicant);
  }

  const request = acceptRequestFromArgs(args, applicantId);
  const outcome = await applicationDecisionService.accept(
    ctx.member,
    application,
    isEmptyAcceptRequest(request) ? null : request,
  );
  const line = acceptedReply(outcome.applicantId, outcome.result, request.tier);
  if (!applicant) return void (await ctx.reply(line));
  const first = await hiddenStaffService.grantFirstLevel(applicant, ctx.member.id);
  await ctx.reply(`${line}\n${hiddenStaffMessages.accept.acceptedHidden(applicant.id, first.roleId)}`);
}

export default definePrefixCommand({
  name: "accept",
  category: "staff",
  async execute(ctx) {
    const responsibilityTicket = await responsibilityDecisionService.ticketFor(ctx.guild.id, ctx.channel.id);
    if (responsibilityTicket) {
      const result = await responsibilityDecisionService.decide({
        guild: ctx.guild,
        actor: ctx.member,
        ticket: responsibilityTicket,
        decision: ResponsibilityDecision.ACCEPTED,
        reason: null,
      });
      await ctx.reply(responsibilityDecisionService.replyFor(result));
      return;
    }

    const { hidden, args } = splitHiddenMode(ctx.args);
    const application = await applicationContextService.forChannel(ctx.guild.id, ctx.channel.id);
    if (application) return acceptInApplication(ctx, application, args, hidden);

    await requireApplyManager(ctx);
    const target = await requireTargetMember(ctx, "!accept @user [level|tier|max] [type] [hidden]");
    if (hidden) await hiddenStaffService.assertCanAccept(ctx.member, target);

    // Accept is for bringing someone in. Current staff (active or on break) are
    // moved with !promote / !demote; fired members come back with !back or a new accept.
    const existing = await staffService.get(target.id, ctx.guild.id);
    if (existing && (existing.status === StaffStatus.ACTIVE || existing.status === StaffStatus.BREAK)) {
      throw new PrefixAbort(M.alreadyStaff(`<@${target.id}>`));
    }

    const request = await resolveAcceptRequest(
      ctx.guild.id,
      acceptRequestFromArgs(args, target.id),
    );
    const result = await staffManagementService.accept(
      target,
      memberActor(ctx.member),
      request.level,
      request.staffType,
    );
    const line = acceptedReply(target.id, result, request.tier);
    if (!hidden) return void (await ctx.reply(line));
    const first = await hiddenStaffService.grantFirstLevel(target, ctx.member.id);
    await ctx.reply(`${line}\n${hiddenStaffMessages.accept.acceptedHidden(target.id, first.roleId)}`);
  },
});
