import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { applicationContextService } from "../../../modules/applications/services/application-context.service.ts";
import { applicationPermissionService } from "../../../modules/applications/services/application-permission.service.ts";
import { staffRecruitmentService } from "../../../modules/applications/services/staff-recruitment.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetId } from "../_shared/target.ts";

const R = staffApplicationMessages.recruiter;
const REPLACE_KEYWORDS = new Set(["replace", "استبدال", "تغيير"]);

export default definePrefixCommand({
  name: "from",
  category: "staff",
  async execute(ctx) {
    const application = await applicationContextService.forChannel(ctx.guild.id, ctx.channel.id);
    if (!application) throw new PrefixAbort(R.notInApplication);

    applicationPermissionService.authorizeDecision(
      ctx.member,
      application.ticket,
      application.application,
    );

    const recruiterId = requireTargetId(ctx, R.usage);
    const replace = ctx.args.some((arg) => REPLACE_KEYWORDS.has(arg.trim().toLowerCase()));
    const outcome = await staffRecruitmentService.setRecruiter({
      actor: ctx.member,
      application: application.application,
      recruiterId,
      replace,
    });

    const applicantId = application.application.userId;
    await ctx.reply(
      outcome === "REPLACED" ? R.replaced(applicantId, recruiterId) : R.saved(applicantId, recruiterId),
    );
  },
});
