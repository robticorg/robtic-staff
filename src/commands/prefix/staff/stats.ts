import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { statsMessages } from "../../../data/messages/stats.ts";
import {
  StatsPeriod,
  buildStatsText,
  canViewStats,
  parseStatsPeriod,
  staffStatisticsService,
} from "../../../modules/staff-stats/index.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { firstUserTarget } from "../_shared/parse.ts";

const PERIOD_WORDS = new Set([
  "d", "day", "daily", "today",
  "w", "week", "weekly",
  "m", "month", "monthly",
  "a", "all", "alltime", "all-time", "total",
]);

export default definePrefixCommand({
  name: "stats",
  aliases: ["statistics"],
  category: "staff",
  async execute(ctx) {
    const targetId = ctx.mentionedUsers[0]?.id ?? firstUserTarget(ctx.args) ?? ctx.member.id;
    const viewingSelf = targetId === ctx.member.id;

    const access = await canViewStats(ctx.member, targetId);
    if (!access.ok) {
      throw new PrefixAbort(viewingSelf ? statsMessages.notStaff : statsMessages.managerOnlyOthers);
    }

    const periodArg = ctx.args.find((a) => PERIOD_WORDS.has(a.toLowerCase()));
    const period = periodArg ? parseStatsPeriod(periodArg) : StatsPeriod.ALL_TIME;

    const stats = await staffStatisticsService.getStaffStats({
      guildId: ctx.guild.id,
      staffId: targetId,
      period,
      detailed: access.detailed,
    });
    if (!stats.found) throw new PrefixAbort(statsMessages.noStaffRecord(`<@${targetId}>`));

    await ctx.reply(buildStatsText(stats));
  },
});
