import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { girlVerificationService } from "../../../modules/applications/services/girl-verification.service.ts";
import { requireTargetMember } from "../_shared/target.ts";

const V = staffApplicationMessages.verify;

export default definePrefixCommand({
  name: "verify",
  category: "staff",
  async execute(ctx) {
    const target = await requireTargetMember(ctx, V.usage);
    await girlVerificationService.verify(ctx.member, target);
    await ctx.reply(V.done(target.id));
  },
});
