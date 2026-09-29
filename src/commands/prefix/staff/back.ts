import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import {
  memberActor,
  staffManagementService,
} from "../../../modules/staff/services/staff-management.service.ts";
import { PrefixAbort, requireRankManager } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";

const M = prefixMessages.staff;

/** !back @user — return a fired member (or one who left and rejoined) to their staff level. */
export default definePrefixCommand({
  name: "back",
  category: "staff",
  async execute(ctx) {
    await requireRankManager(ctx);
    const target = await requireTargetMember(ctx, M.backUsage);
    const mention = `<@${target.id}>`;

    const result = await staffManagementService.reinstate(target, memberActor(ctx.member));
    switch (result.outcome) {
      case "no-record":
        throw new PrefixAbort(M.backNoRecord(mention));
      case "blacklisted":
        throw new PrefixAbort(M.backBlacklisted(mention));
      case "on-break":
        throw new PrefixAbort(M.backOnBreak(mention));
      case "nothing-to-do":
        throw new PrefixAbort(M.backNothingToDo(mention));
      case "reinstated": {
        const lines = [M.backDone(mention, result.level)];
        if (result.awaitingIdentity) {
          lines.push(serverTagMessages.notice.awaitingIdentity(target.id, result.awaitingIdentity.dmSent));
        }
        await ctx.reply(lines.join("\n"));
      }
    }
  },
});
