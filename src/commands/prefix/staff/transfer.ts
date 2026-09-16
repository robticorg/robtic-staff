import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import { staffTransferService } from "../../../modules/staff/services/staff-transfer.service.ts";
import { requireTwoTargetMembers } from "../_shared/target.ts";

const M = staffMessages.transfer;

export default definePrefixCommand({
  name: "transfer",
  category: "staff",
  async execute(ctx) {
    const [source, target] = await requireTwoTargetMembers(ctx, M.usage);

    const result = await staffTransferService.transfer({
      actor: ctx.member,
      source,
      target,
    });

    const sourceMention = `<@${source.id}>`;
    const targetMention = `<@${target.id}>`;

    const lines = [
      result.staffType
        ? M.successWithType(
            sourceMention,
            targetMention,
            result.sourceLevel,
            staffTypeLabel(result.staffType),
          )
        : M.success(sourceMention, targetMention, result.sourceLevel),
      M.rolesLine(result.transferredRoleIds.length, result.removedRoleIds.length),
      result.skippedRoleIds.length > 0 ? M.skippedLine(result.skippedRoleIds.length) : null,
      M.statsNote,
    ].filter((line): line is string => line !== null);

    await ctx.reply(lines.join("\n"));
  },
});
