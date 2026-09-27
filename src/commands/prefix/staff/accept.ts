import { definePrefixCommand, type PrefixContext } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
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
import { PrefixAbort, requireApplyManager } from "../_shared/guards.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetMember } from "../_shared/target.ts";

const M = prefixMessages.staff;

function acceptedReply(targetId: string, result: AcceptResult, tier: StaffTier | null): string {
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

async function acceptInApplication(ctx: PrefixContext, application: ApplicationContext) {
  const applicantId = application.application.userId;
  const named = [...ctx.mentionedUsers.map((u) => u.id), ...extractUserIds(ctx.args)];
  if (named.some((id) => id !== applicantId)) {
    throw new PrefixAbort(staffApplicationMessages.decision.wrongTarget(applicantId));
  }

  const request = acceptRequestFromArgs(ctx.args, applicantId);
  const outcome = await applicationDecisionService.accept(
    ctx.member,
    application,
    isEmptyAcceptRequest(request) ? null : request,
  );
  await ctx.reply(acceptedReply(outcome.applicantId, outcome.result, request.tier));
}

export default definePrefixCommand({
  name: "accept",
  category: "staff",
  async execute(ctx) {
    const application = await applicationContextService.forChannel(ctx.guild.id, ctx.channel.id);
    if (application) return acceptInApplication(ctx, application);

    await requireApplyManager(ctx);
    const target = await requireTargetMember(ctx, "!accept @user [level|tier|max] [type]");

    const request = await resolveAcceptRequest(
      ctx.guild.id,
      acceptRequestFromArgs(ctx.args, target.id),
    );
    const result = await staffManagementService.accept(
      target,
      memberActor(ctx.member),
      request.level,
      request.staffType,
    );
    await ctx.reply(acceptedReply(target.id, result, request.tier));
  },
});
