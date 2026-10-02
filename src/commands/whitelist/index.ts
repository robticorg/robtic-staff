import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, WhitelistSubcommand } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { accessMessages } from "../../data/access/messages.ts";
import { isBotOwner, whitelistService } from "../../modules/access/index.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";

const M = accessMessages.whitelist;
const quiet = { parse: [] as never[] };

const data = new SlashCommandBuilder()
  .setName(CommandName.WHITELIST)
  .setDescription(M.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(WhitelistSubcommand.ADD)
      .setDescription(M.add)
      .addUserOption((o) => o.setName(CommandOption.USER).setDescription(M.userOption).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(WhitelistSubcommand.REMOVE)
      .setDescription(M.remove)
      .addUserOption((o) => o.setName(CommandOption.USER).setDescription(M.userOption).setRequired(true)),
  )
  .addSubcommand((s) => s.setName(WhitelistSubcommand.LIST).setDescription(M.list));

async function reply(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: quiet });
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    if (!isBotOwner(interaction.user.id)) throw new CommandError(M.ownerOnly);

    const sub = interaction.options.getSubcommand();
    if (sub === WhitelistSubcommand.LIST) {
      const entries = await whitelistService.list(guild.id);
      await reply(
        interaction,
        entries.length
          ? [M.listTitle, ...entries.map((e) => M.listRow(e.userId, e.addedBy, e.createdAt))].join("\n")
          : M.empty,
      );
      return;
    }

    const user = interaction.options.getUser(CommandOption.USER, true);
    if (sub === WhitelistSubcommand.ADD) {
      if (user.bot) throw new CommandError(M.bot);
      if (isBotOwner(user.id)) throw new CommandError(M.owner);
      const added = await whitelistService.add(guild.id, user.id, interaction.user.id);
      await reply(interaction, added ? M.added(user.id) : M.alreadyAdded(user.id));
      return;
    }
    if (sub === WhitelistSubcommand.REMOVE) {
      const removed = await whitelistService.remove(guild.id, user.id);
      await reply(interaction, removed ? M.removed(user.id) : M.notListed(user.id));
      return;
    }
    throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
  },
});
