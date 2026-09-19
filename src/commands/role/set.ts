import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { ROLE_SET_SLOTS, ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import {
  RoleConfigType,
  ladderSyncService,
  roleConfigService,
} from "../../modules/configuration/index.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";
import { buildStaffLadder } from "./ladder.ts";
import { handleOwnerWarnSlot } from "./owner-warns.ts";
import { replayLadder, replySuccess } from "./responses.ts";

const SETTABLE = new Set<string>(ROLE_SET_SLOTS);

/**
 * `/role set type:<slot> role:@role` — the single entry point for every
 * single-role slot. The slots that need more than a plain upsert (the ladder
 * ends, IGNORE, the owner-warn trio) branch off here; everything else is one
 * `setRole` call.
 */
export async function handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
  const raw = interaction.options.getString(CommandOption.TYPE, true);
  if (!SETTABLE.has(raw)) throw new CommandError(configMessages.role.unknownSlot(raw));
  const type = raw as RoleConfigType;

  switch (type) {
    case RoleConfigType.START:
      return handleStart(interaction);
    case RoleConfigType.END:
      return handleEnd(interaction);
    case RoleConfigType.IGNORE:
      return handleIgnore(interaction);
    case RoleConfigType.OWNER_WARN_1:
    case RoleConfigType.OWNER_WARN_2:
    case RoleConfigType.OWNER_WARN_3:
      return handleOwnerWarnSlot(interaction, type);
    default:
      return handleSingleton(interaction, type);
  }
}

async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);

  await roleConfigService.setRole({
    guildId: guild.id,
    roleId: role.id,
    type: RoleConfigType.START,
  });

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
  if (!start) throw new CommandError(configMessages.role.needStartFirst);

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

  const excluded = await ladderSyncService.excludedRoleIds(guild.id);
  const ordered = buildStaffLadder({ guild, startRoleId, endRoleId, excludedRoleIds: excluded });

  const ladder = await roleConfigService.rebuildLadder(guild.id, ordered);
  await replayLadder(interaction, ladder);
}

async function handleIgnore(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);

  await roleConfigService.setRole({
    guildId: guild.id,
    roleId: role.id,
    type: RoleConfigType.IGNORE,
  });

  await replySuccess(
    interaction,
    configMessages.role.ignoredConfigured,
    configMessages.role.roleLine(role.id),
    configMessages.role.ignoredNote,
  );
}

async function handleSingleton(
  interaction: ChatInputCommandInteraction,
  type: RoleConfigType,
): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);

  await roleConfigService.setRole({ guildId: guild.id, roleId: role.id, type });

  await replySuccess(
    interaction,
    configMessages.role.singletonConfigured(ROLE_SLOT_LABELS[type]),
    configMessages.role.roleLine(role.id),
    noteFor(type),
  );
}

function noteFor(type: RoleConfigType): string | undefined {
  if (type === RoleConfigType.STAFF || type === RoleConfigType.BLACKLIST) {
    return configMessages.role.notNumberedNote;
  }
  if (
    type === RoleConfigType.WARN_1 ||
    type === RoleConfigType.WARN_2 ||
    type === RoleConfigType.WARN_3
  ) {
    return configMessages.role.warnNote;
  }
  return undefined;
}
