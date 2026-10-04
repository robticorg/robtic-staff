import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { inviteLink } from "../../../modules/applications/shared/invite-code.ts";
import { resolveInvite } from "../../../modules/applications/transfer/staff-transfer-application.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireStaffTicket } from "../_shared/staff-ticket.ts";

const T = staffApplicationMessages.transfer;

export default definePrefixCommand({
  name: "server",
  category: "staff",
  async execute(ctx) {
    await requireStaffTicket(ctx);
    const raw = ctx.args[0];
    if (!raw) throw new PrefixAbort(T.serverUsage);

    const server = await resolveInvite(ctx.guild, raw);
    await ctx.reply(T.serverCard(inviteLink(server.code), server.serverName, server.memberCount, server.onlineCount));
  },
});
