import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { formatDuration } from "../../../modules/vacation/services/duration.ts";
import { vacationService } from "../../../modules/vacation/services/vacation.service.ts";
import { PrefixAbort, requireStaffManager } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";

const BREAK_DURATION = /^\d{1,7}(m|d|w|M)$/;

export default definePrefixCommand({
  name: "break",
  category: "staff",
  async execute(ctx) {
    await requireStaffManager(ctx);
    const target = await requireTargetMember(ctx, vacationMessages.break.usage);

    const durationInput = ctx.args.find((a) => BREAK_DURATION.test(a));
    if (!durationInput) throw new PrefixAbort(vacationMessages.break.invalidDuration);

    try {
      const { vacation } = await vacationService.createManualBreak({
        guildId: ctx.guild.id,
        member: target,
        actorId: ctx.member.id,
        durationInput,
      });
      await ctx.reply(
        vacationMessages.break.done(
          `<@${target.id}>`,
          formatDuration({ value: vacation.duration, unit: vacation.durationUnit }),
          vacation.endsAt,
        ),
      );
    } catch (err) {
      if (err instanceof DomainError) throw new PrefixAbort(err.message);
      throw err;
    }
  },
});
