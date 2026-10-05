import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { applicationContextService } from "../../../modules/applications/services/application-context.service.ts";
import { applicationDecisionService } from "../../../modules/applications/services/application-decision.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import {
  ResponsibilityDecision,
  responsibilityDecisionService,
} from "../../../modules/tickets/responsibility-apply/decision.service.ts";

const D = staffApplicationMessages.decision;

export default definePrefixCommand({
  name: "refuse",
  category: "staff",
  async execute(ctx) {
    const responsibilityTicket = await responsibilityDecisionService.ticketFor(ctx.guild.id, ctx.channel.id);
    if (responsibilityTicket) {
      const result = await responsibilityDecisionService.decide({
        guild: ctx.guild,
        actor: ctx.member,
        ticket: responsibilityTicket,
        decision: ResponsibilityDecision.REFUSED,
        reason: ctx.rest,
      });
      await ctx.reply(responsibilityDecisionService.replyFor(result));
      return;
    }

    const application = await applicationContextService.forChannel(ctx.guild.id, ctx.channel.id);
    if (!application) throw new PrefixAbort(D.notInApplication);

    await applicationDecisionService.refuse(ctx.member, application, ctx.rest);
    await ctx.reply(D.refused(application.application.userId));
  },
});
