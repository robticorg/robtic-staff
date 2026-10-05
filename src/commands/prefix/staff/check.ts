import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { buildCheckCards } from "../../../modules/staff/render/check-card.ts";
import {
  ManagementAuthority,
  staffManagementAuthorizationService,
} from "../../../modules/staff/services/staff-management-authorization.service.ts";
import { staffPromotionPointsService } from "../../../modules/staff/services/staff-promotion-points.service.ts";
import { resolveTierKeyword } from "../../../data/staff-tiers/index.ts";
import { StaffTier } from "../../../modules/configuration/types/enums.ts";
import { PrefixAbort } from "../_shared/guards.ts";

const M = staffMessages.promotionPoints;
const STAFF_KEYWORDS = new Set(["staff", "اداري", "عادي"]);

export function resolveCheckTier(keyword: string): StaffTier | null {
  const key = keyword.trim().toLowerCase();
  if (STAFF_KEYWORDS.has(key)) return StaffTier.STAFF;
  return resolveTierKeyword(key);
}

export default definePrefixCommand({
  name: "check",
  category: "staff",
  async execute(ctx) {
    const authority = await staffManagementAuthorizationService.getAuthority(ctx.member);
    if (authority.kind === ManagementAuthority.NONE) {
      throw new PrefixAbort(prefixMessages.common.notStaffManager);
    }

    const keyword = ctx.args[0];
    const tier = keyword ? resolveCheckTier(keyword) : null;
    if (keyword && !tier) throw new PrefixAbort(M.unknownTier);

    const result = await staffPromotionPointsService.generateCheckResult(ctx.guild, new Date(), tier);
    if (result.requiredPoints === null) throw new PrefixAbort(M.notConfigured);
    if (result.entries.length === 0) throw new PrefixAbort(M.noStaff);

    for (const card of buildCheckCards(result.requiredPoints, result.entries)) {
      await ctx.replyWith(card);
    }
  },
});
