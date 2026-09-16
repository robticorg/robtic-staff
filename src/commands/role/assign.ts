import type { ChatInputCommandInteraction, Role } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { acceptedRoleMessages } from "../../data/messages/accepted.ts";
import { assignMessages } from "../../data/messages/assign.ts";
import { ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import type { RoleConfigType } from "../../modules/configuration/index.ts";
import {
  AcceptedRoleError,
  AcceptedRoleProblem,
} from "../../modules/staff/services/staff-accepted-role.service.ts";
import { staffRoleAssignmentService } from "../../modules/staff/services/staff-role-assignment.service.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const M = assignMessages;
const P = acceptedRoleMessages.problems;

function describe(err: AcceptedRoleError): string {
  if (err.problem === AcceptedRoleProblem.RESERVED) {
    const conflict = err.context?.conflict as RoleConfigType | undefined;
    return P.RESERVED(conflict ? (ROLE_SLOT_LABELS[conflict] ?? conflict) : "");
  }
  return P[err.problem];
}

/** §Command — validation and persistence both live in the service. */
export async function handleAssign(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);

  const role = interaction.options.getRole(CommandOption.ROLE, true) as Role;
  const from = interaction.options.getRole(CommandOption.FROM) as Role | null;
  const to = interaction.options.getRole(CommandOption.TO) as Role | null;

  try {
    const assignment = await staffRoleAssignmentService.configureAssignment({
      guild,
      role,
      fromRole: from,
      toRole: to,
    });

    const all = await staffRoleAssignmentService.getAssignments(guild.id);

    await replySuccess(
      interaction,
      M.title,
      M.role(assignment.roleId),
      assignment.fromLevel === null || assignment.toLevel === null
        ? M.allLevels
        : M.range(assignment.fromLevel, assignment.toLevel),
      "",
      M.total(all.length),
      M.note,
    );
  } catch (err) {
    if (err instanceof AcceptedRoleError) throw new CommandError(describe(err));
    throw err;
  }
}
