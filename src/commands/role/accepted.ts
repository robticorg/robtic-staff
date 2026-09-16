import type { ChatInputCommandInteraction, Role } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { acceptedRoleMessages } from "../../data/messages/accepted.ts";
import { ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import type { RoleConfigType } from "../../modules/configuration/index.ts";
import {
  AcceptedRoleError,
  AcceptedRoleProblem,
  staffAcceptedRoleService,
} from "../../modules/staff/services/staff-accepted-role.service.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const M = acceptedRoleMessages;

function describe(err: AcceptedRoleError): string {
  if (err.problem === AcceptedRoleProblem.RESERVED) {
    const conflict = err.context?.conflict as RoleConfigType | undefined;
    return M.problems.RESERVED(conflict ? (ROLE_SLOT_LABELS[conflict] ?? conflict) : "");
  }
  return M.problems[err.problem];
}

/**
 * §Command — validates nothing beyond option presence; every business rule
 * lives in StaffAcceptedRoleService.
 */
export async function handleAccepted(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);

  const role = interaction.options.getRole(CommandOption.ROLE, true) as Role;
  const from = interaction.options.getRole(CommandOption.FROM) as Role | null;
  const to = interaction.options.getRole(CommandOption.TO) as Role | null;

  try {
    const config = await staffAcceptedRoleService.configure({
      guild,
      role,
      fromRole: from,
      toRole: to,
    });

    await replySuccess(
      interaction,
      M.title,
      M.role(config.roleId),
      config.fromLevel === null || config.toLevel === null
        ? M.allLevels
        : M.range(config.fromLevel, config.toLevel),
      M.note,
      M.existingNote,
    );
  } catch (err) {
    if (err instanceof AcceptedRoleError) throw new CommandError(describe(err));
    throw err;
  }
}
