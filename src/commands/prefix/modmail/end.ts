import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { modmailCaseService } from "../../../modules/modmail/services/modmail-case.service.ts";
import { resolutionService } from "../../../modules/punishment/services/resolution.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";

const END_ERROR_COPY: Record<string, string> = {
  RESOLUTION_NOT_THREAD: prefixMessages.modmail.notAThread,
  RESOLUTION_FORBIDDEN: prefixMessages.modmail.notAllowed,
  RESOLUTION_CLOSED: prefixMessages.modmail.alreadyClosed,
  RESOLUTION_UNCLAIMED: prefixMessages.modmail.claimFirst,
};

export default definePrefixCommand({
  name: "end",
  category: "modmail",
  async execute(ctx) {
    if (!ctx.channel.isThread()) {
      throw new PrefixAbort(prefixMessages.modmail.notAThread);
    }
    const thread = ctx.channel;
    const kase = await modmailCaseService.getByThreadId(thread.id);
    if (!kase || kase.guildId !== ctx.guild.id) {
      throw new PrefixAbort(prefixMessages.modmail.notAThread);
    }

    try {
      await resolutionService.openResolution(kase.caseId, ctx.member, thread);
    } catch (err) {
      if (err instanceof DomainError) {
        throw new PrefixAbort(END_ERROR_COPY[err.code] ?? err.message);
      }
      throw err;
    }
  },
});
