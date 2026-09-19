import type { ChatInputCommandInteraction } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { RoleConfigType } from "../../modules/configuration/index.ts";
import { CommandError } from "../_shared/guards.ts";
import { handleAccess } from "./access.ts";
import { handleAccepted } from "./accepted.ts";
import { handleAssign } from "./assign.ts";

/**
 * `/role range type:<…> role:@role from:@role to:@role` — the slots that bind a
 * role to a span of the ladder. ACCEPTED and ASSIGN need a role and take an
 * optional level range; ACCESS takes either a single role or a from/to span of
 * roles, so `role` is optional on the builder and checked per type here.
 */
export async function handleRange(interaction: ChatInputCommandInteraction): Promise<void> {
  const raw = interaction.options.getString(CommandOption.TYPE, true);

  switch (raw) {
    case RoleConfigType.ACCEPTED:
      requireRole(interaction);
      return handleAccepted(interaction);
    case RoleConfigType.ASSIGN:
      requireRole(interaction);
      return handleAssign(interaction);
    case RoleConfigType.ACCESS:
      return handleAccess(interaction);
    default:
      throw new CommandError(configMessages.role.unknownSlot(raw));
  }
}

function requireRole(interaction: ChatInputCommandInteraction): void {
  if (!interaction.options.getRole(CommandOption.ROLE)) {
    throw new CommandError(configMessages.role.rangeRoleRequired);
  }
}
