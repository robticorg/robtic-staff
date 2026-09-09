import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { statsMessages } from "../../../data/messages/stats.ts";
import {
  buildLeaderboardCard,
  canViewLeaderboard,
  parseStatsPeriod,
  staffStatisticsService,
} from "../../../modules/staff-stats/index.ts";
import { PrefixAbort } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "leaderboard",
  aliases: ["lb", "top"],
  category: "staff",
  async execute(ctx) {
    if (!(await canViewLeaderboard(ctx.member))) {
      throw new PrefixAbort(statsMessages.notStaff);
    }

    const period = parseStatsPeriod(ctx.args[0]);
    const result = await staffStatisticsService.getLeaderboard({
      guildId: ctx.guild.id,
      period,
      limit: 10,
    });

    await ctx.message.reply({
      ...buildLeaderboardCard(result),
      allowedMentions: { repliedUser: false, parse: [] },
    });
  },
});
