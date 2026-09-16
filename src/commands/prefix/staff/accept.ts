import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { STAFF_TIER_KEYWORD_DEFINITIONS } from "../../../data/staff-tiers/index.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import { getLevelForTier } from "../../../modules/configuration/utils/staff-levels.ts";
import {
  memberActor,
  staffManagementService,
} from "../../../modules/staff/services/staff-management.service.ts";
import { staffTypeService } from "../../../modules/staff/services/staff-type.service.ts";
import { AcceptArgProblem, parseAcceptArguments } from "../_shared/accept-args.ts";
import { PrefixAbort, requireApplyManager } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";

const M = prefixMessages.staff;

export default definePrefixCommand({
  name: "accept",
  category: "staff",
  async execute(ctx) {
    await requireApplyManager(ctx);
    const target = await requireTargetMember(ctx, "!accept @user [level|tier] [type]");

    const parsed = parseAcceptArguments(ctx.args, target.id);
    switch (parsed.problem) {
      case AcceptArgProblem.UNKNOWN_TOKEN: {
        const available = [
          ...staffTypeService.getAvailableKeywords(),
          ...STAFF_TIER_KEYWORD_DEFINITIONS.map((d) => d.slug),
        ].join(", ");
        throw new PrefixAbort(M.unknownStaffType(parsed.token ?? "", available));
      }
      case AcceptArgProblem.DUPLICATE_LEVEL:
        throw new PrefixAbort(M.duplicateStaffLevel);
      case AcceptArgProblem.DUPLICATE_TYPE:
        throw new PrefixAbort(M.duplicateStaffType);
      case AcceptArgProblem.DUPLICATE_TIER:
        throw new PrefixAbort(M.duplicateStaffTier);
      case AcceptArgProblem.LEVEL_AND_TIER:
        throw new PrefixAbort(M.levelAndTier);
    }

    let level = parsed.level;
    if (parsed.tier) {
      const tierLevel = await getLevelForTier(ctx.guild.id, parsed.tier);
      if (tierLevel === null) {
        const slug =
          STAFF_TIER_KEYWORD_DEFINITIONS.find((d) => d.tier === parsed.tier)?.slug ??
          parsed.tier.toLowerCase();
        throw new PrefixAbort(M.tierNotConfigured(STAFF_TIER_LABELS[parsed.tier], slug));
      }
      level = tierLevel;
    }

    if (parsed.staffType) {
      const roleId = await staffTypeService.getConfiguredRole(ctx.guild.id, parsed.staffType);
      if (!roleId) {
        const definition = staffTypeService.definition(parsed.staffType);
        throw new PrefixAbort(
          M.staffTypeRoleMissing(
            staffTypeLabel(parsed.staffType),
            definition?.slug ?? parsed.staffType.toLowerCase(),
          ),
        );
      }
    }

    const result = await staffManagementService.accept(
      target,
      memberActor(ctx.member),
      level,
      parsed.staffType,
    );

    const mention = `<@${target.id}>`;
    const tierLabel = parsed.tier ? STAFF_TIER_LABELS[parsed.tier] : null;

    if (tierLabel && result.staffType) {
      await ctx.reply(
        M.acceptedWithTierAndType(
          mention,
          result.level,
          tierLabel,
          staffTypeLabel(result.staffType),
        ),
      );
    } else if (tierLabel) {
      await ctx.reply(M.acceptedWithTier(mention, result.level, tierLabel));
    } else if (result.staffType) {
      await ctx.reply(
        M.acceptedWithType(mention, result.level, staffTypeLabel(result.staffType)),
      );
    } else {
      await ctx.reply(M.accepted(mention, result.level));
    }
  },
});
