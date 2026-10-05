import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { hiddenStaffMessages } from "../../../data/hidden-staff/messages.ts";
import { hiddenStaffVisibilityService } from "../../../modules/staff/hidden/index.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { buildStaffProfileCard } from "../../../modules/staff/render/staff-profile-card.ts";
import {
  ManagementAuthority,
  staffManagementAuthorizationService,
} from "../../../modules/staff/services/staff-management-authorization.service.ts";
import { staffProfileService } from "../../../modules/staff/services/staff-profile.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetId } from "../_shared/target.ts";

const P = staffMessages.profile;

export default definePrefixCommand({
  name: "staff-check",
  category: "staff",
  async execute(ctx) {
    const authority = await staffManagementAuthorizationService.getAuthority(ctx.member);
    if (authority.kind === ManagementAuthority.NONE) {
      throw new PrefixAbort(prefixMessages.common.notStaffManager);
    }

    const userId = requireTargetId(ctx, P.usage);
    if (
      userId !== ctx.member.id &&
      (await hiddenStaffVisibilityService.isHiddenStaff(ctx.member, userId)) &&
      !(await hiddenStaffVisibilityService.canViewHiddenStats(ctx.member, userId))
    ) {
      throw new PrefixAbort(hiddenStaffMessages.stats.hiddenUser);
    }
    const profile = await staffProfileService.get(ctx.guild, userId);
    if (!profile) throw new PrefixAbort(P.notStaff(userId));

    await ctx.replyWith(buildStaffProfileCard(profile));
  },
});
