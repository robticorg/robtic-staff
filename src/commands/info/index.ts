import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type SlashCommandIntegerOption,
  type SlashCommandStringOption,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, InfoSubcommand } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { staffInfoMessages } from "../../data/staff-info/messages.ts";
import { logger } from "../../shared/utils/logger.ts";
import {
  buildInfoAddModal,
  buildInfoEditModal,
  buildInfoPageModal,
} from "../../modules/staff-info/render/modals.ts";
import { buildInfoPage } from "../../modules/staff-info/render/viewer.ts";
import { staffInfoPanelService } from "../../modules/staff-info/services/staff-info-panel.service.ts";
import {
  StaffInfoError,
  staffInfoService,
} from "../../modules/staff-info/services/staff-info.service.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:info");
const M = staffInfoMessages.command;

const infoOption = (required: boolean) => (o: SlashCommandStringOption) =>
  o
    .setName(CommandOption.INFO)
    .setDescription(M.infoOption)
    .setRequired(required)
    .setAutocomplete(true);

/** Autocompletes from the info picked in the same command. */
const pageOption = (o: SlashCommandIntegerOption) =>
  o
    .setName(CommandOption.PAGE)
    .setDescription(M.pageOption)
    .setRequired(true)
    .setMinValue(1)
    .setAutocomplete(true);

const PREVIEW_LENGTH = 70;

const data = new SlashCommandBuilder()
  .setName(CommandName.INFO)
  .setDescription(M.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) => s.setName(InfoSubcommand.SETUP).setDescription(M.setup))
  .addSubcommand((s) => s.setName(InfoSubcommand.ADD).setDescription(M.add))
  .addSubcommand((s) =>
    s.setName(InfoSubcommand.REMOVE).setDescription(M.remove).addStringOption(infoOption(true)),
  )
  .addSubcommand((s) =>
    s.setName(InfoSubcommand.SEE).setDescription(M.see).addStringOption(infoOption(false)),
  )
  .addSubcommand((s) =>
    s
      .setName(InfoSubcommand.ACCESS)
      .setDescription(M.access)
      .addStringOption(infoOption(true))
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(M.roleOption)),
  )
  .addSubcommandGroup((g) =>
    g
      .setName(InfoSubcommand.PAGE_GROUP)
      .setDescription(M.pageGroup)
      .addSubcommand((s) =>
        s.setName(InfoSubcommand.PAGE_ADD).setDescription(M.pageAdd).addStringOption(infoOption(true)),
      )
      .addSubcommand((s) =>
        s
          .setName(InfoSubcommand.PAGE_EDIT)
          .setDescription(M.pageEdit)
          .addStringOption(infoOption(true))
          .addIntegerOption(pageOption),
      )
      .addSubcommand((s) =>
        s
          .setName(InfoSubcommand.PAGE_DELETE)
          .setDescription(M.pageDelete)
          .addStringOption(infoOption(true))
          .addIntegerOption(pageOption),
      ),
  );

async function requireInfo(interaction: ChatInputCommandInteraction, guildId: string) {
  const infoId = interaction.options.getString(CommandOption.INFO, true);
  const info = await staffInfoService.get(guildId, infoId);
  if (!info) throw new CommandError(M.notFound);
  return info;
}

async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    throw new CommandError(M.setupChannelInvalid);
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { created } = await staffInfoPanelService.deploy(guild, channel);
  await interaction.editReply(created ? M.setupDone(channel.id) : M.setupUpdated(channel.id));
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const info = await requireInfo(interaction, guild.id);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const removed = await staffInfoService.remove(guild.id, info.infoId);
  await staffInfoPanelService.refresh(guild);
  await interaction.editReply(M.removed(removed.name));
}

async function handleAccess(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const info = await requireInfo(interaction, guild.id);
  const role = interaction.options.getRole(CommandOption.ROLE);
  if (role && role.id === guild.id) throw new CommandError(M.accessEveryone);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const updated = await staffInfoService.setAccess(guild.id, info.infoId, role?.id ?? null);
  await staffInfoPanelService.refresh(guild); // adds/removes the 🔒 in the menu
  await interaction.editReply({
    content: role ? M.accessSet(updated.name, role.id) : M.accessCleared(updated.name),
    allowedMentions: { parse: [] },
  });
}

async function handleSee(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);

  // With an info: preview it exactly as a member sees it.
  if (interaction.options.getString(CommandOption.INFO)) {
    const info = await requireInfo(interaction, guild.id);
    const page = buildInfoPage(info, 1);
    await interaction.reply({ ...page, flags: page.flags | MessageFlags.Ephemeral });
    return;
  }

  const infos = await staffInfoService.list(guild.id);
  const body = infos.length
    ? [
        M.listTitle,
        "",
        ...infos.map((i, n) =>
          M.listRow(n + 1, i.name, i.description, i.pages.length, i.accessRoleId ?? null),
        ),
      ].join("\n")
    : M.listEmpty;
  await interaction.reply({ content: body, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === InfoSubcommand.PAGE_GROUP) {
      const info = await requireInfo(interaction, interaction.guildId!);
      if (sub === InfoSubcommand.PAGE_ADD) {
        await interaction.showModal(buildInfoPageModal(info.infoId));
        return;
      }

      const page = interaction.options.getInteger(CommandOption.PAGE, true);
      if (page < 1 || page > info.pages.length) {
        throw new CommandError(M.pageNotFound(info.pages.length));
      }
      if (sub === InfoSubcommand.PAGE_EDIT) {
        await interaction.showModal(buildInfoEditModal(info.infoId, page, info.pages[page - 1] ?? ""));
        return;
      }
      if (sub === InfoSubcommand.PAGE_DELETE) {
        const { info: updated } = await staffInfoService
          .removePage(info.guildId, info.infoId, page)
          .catch((err: unknown) => {
            // "last page" / "changed meanwhile" → shown to the admin as a normal command error.
            throw err instanceof StaffInfoError ? new CommandError(err.message) : err;
          });
        await interaction.reply({
          content: M.pageDeleted(updated.name, page, updated.pages.length),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    switch (sub) {
      case InfoSubcommand.SETUP:
        return handleSetup(interaction);
      case InfoSubcommand.ADD:
        await interaction.showModal(buildInfoAddModal());
        return;
      case InfoSubcommand.REMOVE:
        return handleRemove(interaction);
      case InfoSubcommand.SEE:
        return handleSee(interaction);
      case InfoSubcommand.ACCESS:
        return handleAccess(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
  async autocomplete(interaction) {
    try {
      if (!interaction.inGuild()) return void (await interaction.respond([]));

      // page: list the pages of the info already picked, with the start of each one.
      if (interaction.options.getFocused(true).name === CommandOption.PAGE) {
        const infoId = interaction.options.getString(CommandOption.INFO);
        const info = infoId ? await staffInfoService.get(interaction.guildId, infoId) : null;
        if (!info) {
          await interaction.respond([{ name: M.pickInfoFirst, value: 1 }]);
          return;
        }
        await interaction.respond(
          info.pages.slice(0, 25).map((content, i) => ({
            name: M.pageChoice(i + 1, content.replace(/\s+/g, " ").trim().slice(0, PREVIEW_LENGTH)).slice(
              0,
              100,
            ),
            value: i + 1,
          })),
        );
        return;
      }

      const matches = await staffInfoService.search(
        interaction.guildId,
        String(interaction.options.getFocused()),
      );
      await interaction.respond(
        matches.map((i) => ({
          name: `${i.accessRoleId ? "🔒 " : ""}${i.name} (${i.pages.length})`.slice(0, 100),
          value: i.infoId,
        })),
      );
    } catch (err) {
      log.warn("info autocomplete failed", err);
      await interaction.respond([]).catch(() => undefined);
    }
  },
});
