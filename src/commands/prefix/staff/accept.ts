import { definePrefixCommand, type PrefixContext } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import type { StaffTier } from "../../../modules/configuration/types/enums.ts";
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
import { PrefixAbort, requireAcceptManager } from "../_shared/guards.ts";
import { splitHiddenMode } from "../_shared/hidden-mode.ts";
import {
  ResponsibilityDecision,
  responsibilityDecisionService,
} from "../../../modules/tickets/responsibility-apply/decision.service.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetMember } from "../_shared/target.ts";
import { getLevelStart, shownLevel } from "../../../modules/configuration/utils/level-start.ts";

const M = prefixMessages.staff;

function acceptedReply(targetId: string, result: AcceptResult, tier: StaffTier | null, start: number): string {
  // Waiting for the tag or identifier: one short line that says both (accepted, roles come after the tag).
  if (result.awaitingIdentity) return serverTagMessages.notice.awaitingIdentity(targetId, result.awaitingIdentity.dmSent);
  return acceptedLine(targetId, result, tier, start);
}

function acceptedLine(targetId: string, result: AcceptResult, tier: StaffTier | null, start: number): string {
  const mention = `<@${targetId}>`;
  const level = shownLevel(result.level, start);
  const tierLabel = tier ? STAFF_TIER_LABELS[tier] : null;

  if (tierLabel && result.staffType) {
    return M.acceptedWithTierAndType(
      mention,
      level,
      tierLabel,
      staffTypeLabel(result.staffType),
    );
  }
  if (tierLabel) return M.acceptedWithTier(mention, level, tierLabel);
  if (result.staffType) {
    return M.acceptedWithType(mention, level, staffTypeLabel(result.staffType));
  }
  return M.accepted(mention, level);
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
    await requireAcceptManager(ctx);
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
    const line = acceptedReply(target.id, result, request.tier, await getLevelStart(ctx.guild.id));
    if (!hidden) return void (await ctx.reply(line));
    const first = await hiddenStaffService.grantFirstLevel(target, ctx.member.id);
    await ctx.reply(`${line}\n${hiddenStaffMessages.accept.acceptedHidden(target.id, first.roleId)}`);
  },
});
