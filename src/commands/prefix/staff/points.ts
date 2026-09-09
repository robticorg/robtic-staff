import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { statsMessages } from "../../../data/messages/stats.ts";
import {
  buildPointsCard,
  canViewStats,
  staffStatisticsService,
} from "../../../modules/staff-stats/index.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { firstUserTarget } from "../_shared/parse.ts";

export default definePrefixCommand({
  name: "points",
  category: "staff",
  async execute(ctx) {
    const targetId = ctx.mentionedUsers[0]?.id ?? firstUserTarget(ctx.args) ?? ctx.member.id;
    const viewingSelf = targetId === ctx.member.id;

    const access = await canViewStats(ctx.member, targetId);
    if (!access.ok) {
      throw new PrefixAbort(viewingSelf ? statsMessages.notStaff : statsMessages.managerOnlyOthers);
    }

    const data = await staffStatisticsService.getPointsCard({
      guildId: ctx.guild.id,
      staffId: targetId,
    });
    if (!data.found) throw new PrefixAbort(statsMessages.noStaffRecord(`<@${targetId}>`));

    await ctx.message.reply({
      ...buildPointsCard(targetId, data),
      allowedMentions: { repliedUser: false, parse: [] },
    });
  },
});
