import type { ChatInputCommandInteraction, Role } from "discord.js";
import { MessageFlags } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { accessMessages } from "../../data/messages/access.ts";
import { ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import {
  AccessRoleRejection,
  staffAccessRoleService,
  type AccessRoleUpdate,
  type RejectedRole,
} from "../../modules/configuration/index.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const M = accessMessages;
const MAX_LISTED = 15;

function mentions(roleIds: readonly string[]): string {
  const shown = roleIds.slice(0, MAX_LISTED).map((id) => `<@&${id}>`);
  const rest = roleIds.length - shown.length;
  return rest > 0 ? `${shown.join("، ")} ${M.andMore(rest)}` : shown.join("، ");
}

function describeRejection(rejected: RejectedRole): string {
  switch (rejected.reason) {
    case AccessRoleRejection.EVERYONE:
      return M.rejected.everyone;
    case AccessRoleRejection.MANAGED:
      return M.rejected.managed(rejected.roleId);
    case AccessRoleRejection.UNMANAGEABLE:
      return M.rejected.unmanageable(rejected.roleId);
    case AccessRoleRejection.ALREADY_CONFIGURED:
      return M.rejected.already(rejected.roleId);
    case AccessRoleRejection.RESERVED:
      return M.rejected.reserved(
        rejected.roleId,
        rejected.conflict ? (ROLE_SLOT_LABELS[rejected.conflict] ?? rejected.conflict) : "",
      );
    case AccessRoleRejection.MISSING:
      return M.rejected.missing(rejected.roleId);
  }
}

function summarise(update: AccessRoleUpdate): (string | undefined)[] {
  const lines: (string | undefined)[] = [];

  if (update.added.length > 0) {
    lines.push(M.added(update.added.length), mentions(update.added));
  } else {
    lines.push(M.nothingAdded);
  }

  if (update.rejected.length > 0) {
    const grouped = update.rejected.slice(0, MAX_LISTED).map(describeRejection);
    lines.push("", M.skipped(update.rejected.length), ...grouped);
  }

  lines.push("", M.total(update.total), M.note);
  return lines;
}

/**
 * §Architecture — the command only validates input and delegates; all
 * persistence and role-safety rules live in StaffAccessRoleService.
 */
export async function handleAccess(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);

  const from = interaction.options.getRole(CommandOption.FROM) as Role | null;
  const to = interaction.options.getRole(CommandOption.TO) as Role | null;
  const single = interaction.options.getRole(CommandOption.ROLE) as Role | null;

  if (!from && !to && !single) throw new CommandError(M.errors.noOptions);
  if (from && !to) throw new CommandError(M.errors.fromWithoutTo);
  if (to && !from) throw new CommandError(M.errors.toWithoutFrom);

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const roles: Role[] = [];
  if (from && to) {
    const inRange = staffAccessRoleService.resolveRoleRange(guild, from.id, to.id);
    if (inRange.length === 0) throw new CommandError(M.errors.emptyRange);
    roles.push(...inRange);
  }
  if (single) roles.push(single);

  const update = await staffAccessRoleService.addAccessRoles(guild, roles);
  await replySuccess(interaction, M.title, ...summarise(update));
}
