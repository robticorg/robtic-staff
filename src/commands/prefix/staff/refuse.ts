import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import {
  ResponsibilityDecision,
  responsibilityDecisionService,
} from "../../../modules/tickets/responsibility-apply/decision.service.ts";

// Refuses a responsibility application, in its ticket. (Staff applications were removed from the bot.)
export default definePrefixCommand({
  name: "refuse",
  category: "staff",
  async execute(ctx) {
    const ticket = await responsibilityDecisionService.ticketFor(ctx.guild.id, ctx.channel.id);
    if (!ticket) throw new PrefixAbort();
    const result = await responsibilityDecisionService.decide({
      guild: ctx.guild,
      actor: ctx.member,
      ticket,
      decision: ResponsibilityDecision.REFUSED,
      reason: ctx.rest,
    });
    await ctx.reply(responsibilityDecisionService.replyFor(result));
  },
});
