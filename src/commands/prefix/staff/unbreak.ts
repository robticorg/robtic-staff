import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { vacationService } from "../../../modules/vacation/services/vacation.service.ts";
import { PrefixAbort, requireStaffManager } from "../_shared/guards.ts";
import { requireTargetId } from "../_shared/target.ts";

export default definePrefixCommand({
  name: "unbreak",
  category: "staff",
  async execute(ctx) {
    await requireStaffManager(ctx);
    const targetId = requireTargetId(ctx, vacationMessages.unbreak.usage);
    const member = await ctx.guild.members.fetch(targetId).catch(() => null);

    try {
      const result = await vacationService.unbreak({
        guildId: ctx.guild.id,
        staffId: targetId,
        member,
        actorId: ctx.member.id,
      });

      if (!member) {
        await ctx.reply(vacationMessages.unbreak.targetNotInGuild);
      } else if (result.missingCount > 0) {
        await ctx.reply(vacationMessages.unbreak.doneNoRestore(`<@${targetId}>`));
      } else {
        await ctx.reply(vacationMessages.unbreak.done(`<@${targetId}>`));
      }
    } catch (err) {
      if (err instanceof DomainError) throw new PrefixAbort(err.message);
      throw err;
    }
  },
});
