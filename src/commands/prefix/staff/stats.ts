import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { hiddenStaffMessages } from "../../../data/hidden-staff/messages.ts";
import { statsMessages } from "../../../data/messages/stats.ts";
import { canViewStats } from "../../../modules/staff-stats/index.ts";
import { StatsView } from "../../../modules/staff-stats/handlers/component-ids.ts";
import { renderStatsView } from "../../../modules/staff-stats/handlers/stats-view.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { firstUserTarget } from "../_shared/parse.ts";

export default definePrefixCommand({
  name: "stats",
  aliases: ["statistics"],
  category: "staff",
  async execute(ctx) {
    const targetId = ctx.mentionedUsers[0]?.id ?? firstUserTarget(ctx.args) ?? ctx.member.id;
    const viewingSelf = targetId === ctx.member.id;

    const access = await canViewStats(ctx.member, targetId);
    if (!access.ok) {
      if (access.hidden) throw new PrefixAbort(hiddenStaffMessages.stats.hiddenUser);
      throw new PrefixAbort(viewingSelf ? statsMessages.notStaff : statsMessages.managerOnlyOthers);
    }

    const card = await renderStatsView(
      ctx.guild,
      { viewerId: ctx.member.id, targetId },
      StatsView.HOME,
    );
    if (!card) throw new PrefixAbort(statsMessages.noStaffRecord(`<@${targetId}>`));

    await ctx.replyWith(card);
  },
});
