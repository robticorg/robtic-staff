import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { branding } from "../../data/config/branding.ts";
import { L } from "../../shared/utils/lang-context.ts";

// /help: what the bot does, where to start, and every slash command (read from the command list, so a new one shows
// itself). The bot's status points here ("Use /help to start").

interface CommandJson { name: string; description: string; options?: { type: number; name: string; description: string }[] }

const SUBCOMMAND = 1;
const SUBCOMMAND_GROUP = 2;

const data = new SlashCommandBuilder()
  .setName(CommandName.HELP)
  .setDescription(commandCopy.help.description);

export default defineCommand({
  data,
  async execute(interaction) {
    // Read lazily: the command list imports this command.
    const { commands } = await import("../index.ts");
    const lines = commands
      .map((c) => c.data.toJSON() as CommandJson)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const subs = (c.options ?? []).filter((o) => o.type === SUBCOMMAND || o.type === SUBCOMMAND_GROUP).map((o) => o.name);
        return `\`/${c.name}\`${subs.length ? ` (${subs.join(", ")})` : ""} ${c.description}`;
      });
    const embed = new EmbedBuilder()
      .setColor(0x3d7bff)
      .setTitle(branding.moderationTitle)
      .setDescription([
        L(
          "Runs your staff team: the staff ladder and its roles, points and promotions, tickets and warnings.",
          "يدير طاقمك الإداري: سلّم الطاقم ورتبه، النقاط والترقيات، التكتات والتحذيرات.",
        ),
        "",
        L(
          "**Start here:** set your staff roles with `/role`, then run `/scan` to import your staff.",
          "**ابدأ من هنا:** اضبط رتب الطاقم بـ `/role`، ثم شغّل `/scan` لاستيراد طاقمك.",
        ),
        "",
        L("**Commands**", "**الأوامر**"),
        ...lines,
        "",
        L("More Robtic bots and the dashboard: https://robtic.org", "بوتات Robtic الأخرى ولوحة التحكم: https://robtic.org"),
      ].join("\n").slice(0, 4096));
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
});
