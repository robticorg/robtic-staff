import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { replyFailure } from "./responses.ts";

export class CommandError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("COMMAND_ERROR", message, context);
  }
}

export function requireGuild(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guild) {
    throw new CommandError(commonMessages.errors.guildOnly);
  }
  return interaction.guild;
}

export function requireAdministrator(interaction: ChatInputCommandInteraction): void {
  const member = interaction.member as GuildMember | null;
  const perms = member?.permissions;
  if (!perms || typeof perms === "string" || !perms.has(PermissionFlagsBits.Administrator)) {
    throw new CommandError(commonMessages.errors.needAdministrator);
  }
}

export async function requireMember(
  interaction: ChatInputCommandInteraction,
): Promise<GuildMember> {
  const guild = requireGuild(interaction);
  const cached = interaction.member as GuildMember | null;
  if (cached && "roles" in cached && typeof cached.permissions !== "string") return cached;
  const fetched = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!fetched) throw new CommandError(commonMessages.errors.membershipUnverified);
  return fetched;
}

export async function handleGuardError(
  interaction: ChatInputCommandInteraction,
  err: unknown,
): Promise<boolean> {
  if (err instanceof CommandError || (err instanceof DomainError && err.code === "VALIDATION_ERROR")) {
    await replyFailure(interaction, commonMessages.errors.commandNotCompleted, err.message);
    return true;
  }
  return false;
}
