import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import {
  RoleConfigType,
  roleConfigService,
} from "../../modules/configuration/index.ts";
import {
  CommandName,
  CommandOption,
  RoleSubcommand,
  commandCopy,
} from "../../data/commands/index.ts";
import { ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { configMessages } from "../../data/messages/config.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replayLadder, replySuccess } from "./responses.ts";
import { buildStaffLadder } from "./ladder.ts";

const NON_NUMBERED_TYPES = [
  RoleConfigType.STAFF,
  RoleConfigType.BLACKLIST,
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.VACATION,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
] as const;

const copy = commandCopy.role;

const data = new SlashCommandBuilder()
  .setName(CommandName.ROLE)
  .setDescription(copy.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.START)
      .setDescription(copy.sub.start.description)
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(copy.sub.start.option).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.END)
      .setDescription(copy.sub.end.description)
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(copy.sub.end.option).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.STAFF)
      .setDescription(copy.sub.staff.description)
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(copy.sub.staff.option).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.IGNORE)
      .setDescription(copy.sub.ignore.description)
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(copy.sub.ignore.option).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.BLACKLIST)
      .setDescription(copy.sub.blacklist.description)
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(copy.sub.blacklist.option).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.STAFF_MANAGER)
      .setDescription(copy.sub.staffmanager.description)
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.staffmanager.option).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.WARN)
      .setDescription(copy.sub.warn.description)
      .addRoleOption((o) =>
        o.setName(CommandOption.WARN_1).setDescription(copy.sub.warn.options.warn1).setRequired(true),
      )
      .addRoleOption((o) =>
        o.setName(CommandOption.WARN_2).setDescription(copy.sub.warn.options.warn2).setRequired(true),
      )
      .addRoleOption((o) =>
        o.setName(CommandOption.WARN_3).setDescription(copy.sub.warn.options.warn3).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.MUTE)
      .setDescription(copy.sub.mute.description)
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(copy.sub.mute.option).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.JAIL)
      .setDescription(copy.sub.jail.description)
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(copy.sub.jail.option).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.CHAT_MANAGER)
      .setDescription(copy.sub.chatmanager.description)
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.chatmanager.option).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.VACATION)
      .setDescription(copy.sub.vacation.description)
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.vacation.option).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.APPEAL_MANAGER)
      .setDescription(copy.sub.appealmanager.description)
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.appealmanager.option).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.GIFT_MANAGER)
      .setDescription(copy.sub.giftmanager.description)
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.giftmanager.option).setRequired(true),
      ),
  );

async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);

  await roleConfigService.setRole({ guildId: guild.id, roleId: role.id, type: RoleConfigType.START });

  const end = await roleConfigService.getEndRole(guild.id);
  if (end && guild.roles.cache.has(end.roleId) && end.roleId !== role.id) {
    await rebuildFromConfig(interaction, role.id, end.roleId);
    return;
  }

  await replySuccess(
    interaction,
    configMessages.role.startConfigured,
    configMessages.role.roleLine(role.id),
    configMessages.role.levelLine(0),
  );
}

async function handleEnd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const start = await roleConfigService.getStartRole(guild.id);
  if (!start) {
    throw new CommandError(configMessages.role.needStartFirst);
  }
  const endRole = interaction.options.getRole(CommandOption.ROLE, true);
  await rebuildFromConfig(interaction, start.roleId, endRole.id);
}

async function rebuildFromConfig(
  interaction: ChatInputCommandInteraction,
  startRoleId: string,
  endRoleId: string,
): Promise<void> {
  const guild = requireGuild(interaction);

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const [ignored, generalStaff, others] = await Promise.all([
    roleConfigService.getIgnoredRoleIds(guild.id),
    roleConfigService.getByType(guild.id, RoleConfigType.STAFF),
    Promise.all(
      NON_NUMBERED_TYPES.filter((t) => t !== RoleConfigType.STAFF).map((t) =>
        roleConfigService.listByType(guild.id, t),
      ),
    ),
  ]);

  const excluded = new Set<string>(ignored);
  if (generalStaff) excluded.add(generalStaff.roleId);
  for (const list of others) for (const cfg of list) excluded.add(cfg.roleId);

  const ordered = buildStaffLadder({
    guild,
    startRoleId,
    endRoleId,
    excludedRoleIds: excluded,
  });

  const ladder = await roleConfigService.rebuildLadder(guild.id, ordered);
  await replayLadder(interaction, ladder);
}

async function handleSingleton(
  interaction: ChatInputCommandInteraction,
  type: (typeof NON_NUMBERED_TYPES)[number],
): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);
  await roleConfigService.setRole({ guildId: guild.id, roleId: role.id, type });
  await replySuccess(
    interaction,
    configMessages.role.singletonConfigured(ROLE_SLOT_LABELS[type]),
    configMessages.role.roleLine(role.id),
    type === RoleConfigType.STAFF || type === RoleConfigType.BLACKLIST
      ? configMessages.role.notNumberedNote
      : undefined,
  );
}

async function handleIgnore(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);
  await roleConfigService.setRole({ guildId: guild.id, roleId: role.id, type: RoleConfigType.IGNORE });
  await replySuccess(
    interaction,
    configMessages.role.ignoredConfigured,
    configMessages.role.roleLine(role.id),
    configMessages.role.ignoredNote,
  );
}

async function handleWarn(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const warn1 = interaction.options.getRole(CommandOption.WARN_1, true);
  const warn2 = interaction.options.getRole(CommandOption.WARN_2, true);
  const warn3 = interaction.options.getRole(CommandOption.WARN_3, true);

  await roleConfigService.setRole({ guildId: guild.id, roleId: warn1.id, type: RoleConfigType.WARN_1 });
  await roleConfigService.setRole({ guildId: guild.id, roleId: warn2.id, type: RoleConfigType.WARN_2 });
  await roleConfigService.setRole({ guildId: guild.id, roleId: warn3.id, type: RoleConfigType.WARN_3 });

  await replySuccess(
    interaction,
    configMessages.role.warnConfigured,
    configMessages.role.warnLine(1, warn1.id),
    configMessages.role.warnLine(2, warn2.id),
    configMessages.role.warnLine(3, warn3.id),
    configMessages.role.warnNote,
  );
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case RoleSubcommand.START:
        return handleStart(interaction);
      case RoleSubcommand.END:
        return handleEnd(interaction);
      case RoleSubcommand.STAFF:
        return handleSingleton(interaction, RoleConfigType.STAFF);
      case RoleSubcommand.IGNORE:
        return handleIgnore(interaction);
      case RoleSubcommand.BLACKLIST:
        return handleSingleton(interaction, RoleConfigType.BLACKLIST);
      case RoleSubcommand.STAFF_MANAGER:
        return handleSingleton(interaction, RoleConfigType.STAFF_MANAGER);
      case RoleSubcommand.MUTE:
        return handleSingleton(interaction, RoleConfigType.MUTE);
      case RoleSubcommand.JAIL:
        return handleSingleton(interaction, RoleConfigType.JAIL);
      case RoleSubcommand.CHAT_MANAGER:
        return handleSingleton(interaction, RoleConfigType.CHAT_MANAGER);
      case RoleSubcommand.VACATION:
        return handleSingleton(interaction, RoleConfigType.VACATION);
      case RoleSubcommand.APPEAL_MANAGER:
        return handleSingleton(interaction, RoleConfigType.APPEAL_MANAGER);
      case RoleSubcommand.GIFT_MANAGER:
        return handleSingleton(interaction, RoleConfigType.GIFT_MANAGER);
      case RoleSubcommand.WARN:
        return handleWarn(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
});
