import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import {
  CommandName,
  CommandOption,
  FastAccessSubcommand,
  commandCopy,
} from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { fastAccessMessages } from "../../data/messages/fast-access.ts";
import { ValidationError } from "../../shared/utils/errors.ts";
import {
  fastAccessService,
  tryNormaliseFastAccessCommand,
} from "../../modules/configuration/services/fast-access.service.ts";
import { FastAccessContext } from "../../modules/configuration/types/enums.ts";
import { staffPermissionService } from "../../modules/staff/services/staff-permissions.service.ts";
import { CommandError, requireGuild, requireMember } from "../_shared/guards.ts";

const M = fastAccessMessages;
const copy = commandCopy.fastAccess;

const data = new SlashCommandBuilder()
  .setName(CommandName.FAST_ACCESS)
  .setDescription(copy.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(FastAccessSubcommand.ADD)
      .setDescription(copy.sub.add.description)
      .addStringOption((o) =>
        o.setName(CommandOption.CMD).setDescription(copy.sub.add.options.cmd).setRequired(true).setMaxLength(33),
      )
      .addStringOption((o) =>
        o
          .setName(CommandOption.MESSAGE)
          .setDescription(copy.sub.add.options.message)
          .setRequired(true)
          .setMaxLength(2000),
      )
      .addStringOption((o) =>
        o
          .setName(CommandOption.CONTEXT)
          .setDescription(copy.sub.add.options.context)
          .setRequired(true)
          .addChoices(
            { name: "المودميل / البلاغات", value: FastAccessContext.MODMAIL },
            { name: "الدعم (التكتات)", value: FastAccessContext.SUPPORT },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(FastAccessSubcommand.REMOVE)
      .setDescription(copy.sub.remove.description)
      .addStringOption((o) =>
        o.setName(CommandOption.CMD).setDescription(copy.sub.remove.option).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s.setName(FastAccessSubcommand.LIST).setDescription(copy.sub.list.description),
  );

async function ensureManager(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = await requireMember(interaction);
  if (!(await staffPermissionService.isStaffManager(member))) {
    throw new CommandError(M.managerOnly);
  }
}

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  await ensureManager(interaction);

  const rawCmd = interaction.options.getString(CommandOption.CMD, true);
  const message = interaction.options.getString(CommandOption.MESSAGE, true);
  const context = interaction.options.getString(CommandOption.CONTEXT, true) as FastAccessContext;

  const command = tryNormaliseFastAccessCommand(rawCmd);
  if (!command) throw new CommandError(M.invalidCommand);
  if (!message.trim()) throw new CommandError(M.emptyMessage);
  if (context !== FastAccessContext.MODMAIL && context !== FastAccessContext.SUPPORT) {
    throw new CommandError(M.invalidContext);
  }
  if (await fastAccessService.existsForCommand(guild.id, command)) {
    throw new CommandError(M.alreadyExists(command));
  }

  try {
    await fastAccessService.create({
      guildId: guild.id,
      command,
      message,
      contextType: context,
      createdBy: interaction.user.id,
    });
  } catch (err) {
    if (err instanceof ValidationError) throw new CommandError(err.message);
    throw err;
  }

  await interaction.reply({ content: M.created(command, context), flags: MessageFlags.Ephemeral });
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  await ensureManager(interaction);

  const rawCmd = interaction.options.getString(CommandOption.CMD, true);
  const command = tryNormaliseFastAccessCommand(rawCmd) ?? rawCmd.replace(/^\$/, "").toLowerCase();
  const doc = await fastAccessService.getByCommand(guild.id, command);
  if (!doc) throw new CommandError(M.notFound(command));

  await fastAccessService.remove(doc._id);
  await interaction.reply({ content: M.removed(command), flags: MessageFlags.Ephemeral });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  await ensureManager(interaction);

  const entries = await fastAccessService.listByGuild(guild.id);
  const body =
    entries.length === 0
      ? M.listEmpty
      : [
          M.listTitle,
          "",
          ...entries.map((e) => M.listLine(e.command, e.contextType, e.enabled)),
        ].join("\n");
  await interaction.reply({ content: body, flags: MessageFlags.Ephemeral });
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.ManageGuild,
  async execute(interaction) {
    requireGuild(interaction);
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case FastAccessSubcommand.ADD:
        return handleAdd(interaction);
      case FastAccessSubcommand.REMOVE:
        return handleRemove(interaction);
      case FastAccessSubcommand.LIST:
        return handleList(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
});
