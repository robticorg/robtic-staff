import type { ChatInputCommandInteraction, Role } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { staffTypeMessages } from "../../data/messages/staff-type.ts";
import { ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import { staffTypeLabel, type StaffTypeDefinition } from "../../data/staff-types/index.ts";
import type { RoleConfigType } from "../../modules/configuration/index.ts";
import {
  StaffTypeError,
  StaffTypeProblem,
  staffTypeService,
} from "../../modules/staff/services/staff-type.service.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const M = staffTypeMessages;

function describe(err: StaffTypeError): string {
  if (err.problem === StaffTypeProblem.RESERVED) {
    const conflict = err.context?.conflict as RoleConfigType | undefined;
    return M.problems.RESERVED(conflict ? (ROLE_SLOT_LABELS[conflict] ?? conflict) : "");
  }
  return M.problems[err.problem];
}

export async function handleStaffType(
  interaction: ChatInputCommandInteraction,
  definition: StaffTypeDefinition,
): Promise<void> {
  requireAdministrator(interaction);
  const guild = requireGuild(interaction);

  const role = interaction.options.getRole(CommandOption.ROLE, true) as Role;

  try {
    const configured = await staffTypeService.configureRole(guild, definition.id, role);
    await replySuccess(
      interaction,
      M.title,
      M.configured(staffTypeLabel(configured.staffType), configured.roleId),
      M.usage(definition.slug),
      "",
      M.note,
    );
  } catch (err) {
    if (err instanceof StaffTypeError) throw new CommandError(describe(err));
    throw err;
  }
}
