import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import {
  memberActor,
  staffManagementService,
} from "../../../modules/staff/services/staff-management.service.ts";
import { staffTypeService } from "../../../modules/staff/services/staff-type.service.ts";
import { AcceptArgProblem, parseAcceptArguments } from "../_shared/accept-args.ts";
import { PrefixAbort, requireStaffManager } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";

const M = prefixMessages.staff;

export default definePrefixCommand({
  name: "accept",
  category: "staff",
  async execute(ctx) {
    await requireStaffManager(ctx);
    const target = await requireTargetMember(ctx, "!accept @user [level] [type]");

    // §Parser — the command itself holds no parsing or Staff Type logic.
    const parsed = parseAcceptArguments(ctx.args, target.id);
    switch (parsed.problem) {
      case AcceptArgProblem.UNKNOWN_TOKEN:
        // §Type Validation — reject outright rather than partially accepting.
        throw new PrefixAbort(
          M.unknownStaffType(parsed.token ?? "", staffTypeService.getAvailableKeywords().join(", ")),
        );
      case AcceptArgProblem.DUPLICATE_LEVEL:
        throw new PrefixAbort(M.duplicateStaffLevel);
      case AcceptArgProblem.DUPLICATE_TYPE:
        throw new PrefixAbort(M.duplicateStaffType);
    }

    // A type with no configured role would accept the member and silently skip
    // the role, so it is checked before anything is written.
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
      parsed.level,
      parsed.staffType,
    );

    await ctx.reply(
      result.staffType
        ? M.acceptedWithType(`<@${target.id}>`, result.level, staffTypeLabel(result.staffType))
        : M.accepted(`<@${target.id}>`, result.level),
    );
  },
});
