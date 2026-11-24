import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { branding } from "../../data/config/branding.ts";
import { currentLang, currentGuildId, L, runWithLang } from "../../shared/utils/lang-context.ts";

// /help, in the style every Robtic bot shares (Robtic System's): an overview with where to start and the categories,
// a menu to open one category, one line per command, and a button to every command on robtic.org/discord/commands.
// Commands are read from the command list, so a new one shows itself. Categories match the website's
// (robtic-discord libs/shared/src/bots.ts COMMAND_GROUPS.staff).

const COLOR = 0x3498db;
const OVERVIEW = "__overview__";
const SELECT_ID = "help:category";
const COMMANDS_URL = "https://robtic.org/discord/commands#bot-staff";
const IDLE_MS = 120_000;

const CATEGORIES: { key: string; en: string; ar: string; emoji: string; names: string[] }[] = [
  { key: "start", en: "Getting started", ar: "البداية", emoji: "🚀", names: ["help", "scan", "role", "channels", "profile"] },
  { key: "ladder", en: "Staff ladder", ar: "سلّم الطاقم", emoji: "🪜", names: ["start-count", "lead", "intake", "whitelist", "warn-setup"] },
  { key: "points", en: "Points and promotion", ar: "النقاط والترقية", emoji: "🏅", names: ["points", "promote-points", "ticket-stats"] },
  { key: "tickets", en: "Tickets", ar: "التكتات", emoji: "🎫", names: ["ticket", "sleep", "faq"] },
  { key: "tools", en: "Tools", ar: "أدوات", emoji: "🧰", names: [] },
];
const label = (c: (typeof CATEGORIES)[number]) => L(c.en, c.ar);

interface Line { name: string; description: string; subs: number }

function grouped(list: { data: { toJSON: () => unknown } }[]): Map<string, Line[]> {
  const groups = new Map<string, Line[]>(CATEGORIES.map((c) => [c.key, []]));
  const all = list.map((c) => c.data.toJSON() as { name: string; description: string; options?: { type: number }[] });
  for (const c of all.sort((a, b) => a.name.localeCompare(b.name))) {
    const cat = CATEGORIES.find((k) => k.names.includes(c.name)) ?? CATEGORIES[CATEGORIES.length - 1]!;
    groups.get(cat.key)!.push({ name: c.name, description: c.description, subs: (c.options ?? []).filter((o) => o.type === 1 || o.type === 2).length });
  }
  for (const [k, v] of groups) if (!v.length) groups.delete(k);
  return groups;
}

const cat = (key: string) => CATEGORIES.find((c) => c.key === key)!;
const count = (n: number) => L(`${n} ${n === 1 ? "command" : "commands"}`, `${n} أمر`);

function overview(groups: Map<string, Line[]>): EmbedBuilder {
  const total = [...groups.values()].reduce((n, l) => n + l.length, 0);
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(L(`📖 ${branding.moderationTitle}: commands`, `📖 ${branding.moderationTitle}: الأوامر`))
    .setDescription([
      L("Runs your staff team: the staff ladder and its roles, points and promotions, tickets and warnings.",
        "يدير طاقمك الإداري: سلّم الطاقم ورتبه، النقاط والترقيات، التكتات والتحذيرات."),
      L("**Start here:** set your staff roles with `/role`, then run `/scan` to import your staff.",
        "**ابدأ من هنا:** اضبط رتب الطاقم بـ `/role`، ثم شغّل `/scan` لاستيراد طاقمك."),
      `${L("**Categories:**", "**الأقسام:**")} ${[...groups].map(([key, list]) => `${cat(key).emoji} ${label(cat(key))} \`${list.length}\``).join(" • ")}`,
      L("Use the menu below to browse a category.", "استخدم القائمة تحت لتصفح أوامر كل قسم."),
    ].join("\n\n"))
    .setFooter({ text: `${count(total)} • robtic.org/discord/commands` });
}

function category(groups: Map<string, Line[]>, key: string): EmbedBuilder {
  const list = groups.get(key) ?? [];
  const c = cat(key);
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`📖 ${branding.moderationTitle}: ${c.emoji} ${label(c)}`)
    .setDescription(list.map((x) => `• \`/${x.name}\` — ${x.description}${x.subs ? ` *(${L(`${x.subs} subcommands`, `${x.subs} أوامر فرعية`)})*` : ""}`).join("\n").slice(0, 4000) || L("No commands here.", "لا توجد أوامر هنا."))
    .setFooter({ text: `${count(list.length)} • robtic.org/discord/commands` });
}

function rows(groups: Map<string, Line[]>, view: string) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(SELECT_ID)
    .setPlaceholder(L("📂 Pick a command category…", "📂 اختر قسم الأوامر…"))
    .addOptions(
      { label: L("🏠 Overview", "🏠 نظرة عامة"), value: OVERVIEW, default: view === OVERVIEW },
      ...[...groups].map(([key, list]) => ({ label: `${cat(key).emoji} ${label(cat(key))}`, description: count(list.length), value: key, default: view === key })),
    );
  const link = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(COMMANDS_URL).setLabel(L("See all commands", "كل الأوامر"));
  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), new ActionRowBuilder<ButtonBuilder>().addComponents(link)];
}

const data = new SlashCommandBuilder()
  .setName(CommandName.HELP)
  .setDescription(commandCopy.help.description);

export default defineCommand({
  data,
  async execute(interaction) {
    // Read lazily: the command list imports this command.
    const { commands } = await import("../index.ts");
    const groups = grouped(commands);
    let view = OVERVIEW;
    // The menu's answers arrive outside this command's language context: keep the server's language for them.
    const lang = currentLang();
    const guildId = currentGuildId();
    const render = () => runWithLang(lang, () => ({ embeds: [view === OVERVIEW ? overview(groups) : category(groups, view)], components: rows(groups, view) }), guildId);
    const reply = await interaction.reply({ ...render(), flags: MessageFlags.Ephemeral, withResponse: true });
    const message = reply.resource?.message;
    if (!message) return;
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, idle: IDLE_MS });
    collector.on("collect", async (pick) => {
      if (pick.customId !== SELECT_ID) return;
      view = pick.values[0] ?? OVERVIEW;
      await pick.update(render()).catch(() => null);
    });
    collector.on("end", () => { void interaction.editReply({ components: [render().components[1]!] }).catch(() => null); });
  },
});
