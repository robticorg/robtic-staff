import type { ChatInputCommandInteraction, Role } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { OWNER_WARN_SLOTS, ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import { roleConfigService } from "../../modules/configuration/index.ts";
import { ROLE_CONFIG_TYPE_VALUES, RoleConfigType } from "../../modules/configuration/types/enums.ts";
import { getHierarchy } from "../../modules/configuration/utils/staff-levels.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "./responses.ts";

const OWNER_WARN_LEVEL: Partial<Record<RoleConfigType, number>> = {
  [RoleConfigType.OWNER_WARN_1]: 1,
  [RoleConfigType.OWNER_WARN_2]: 2,
  [RoleConfigType.OWNER_WARN_3]: 3,
};

/** Any slot other than the owner-warn trio is off-limits for an owner-warn role. */
const RESERVED_TYPES: readonly RoleConfigType[] = ROLE_CONFIG_TYPE_VALUES.filter(
  (type) => !OWNER_WARN_SLOTS.includes(type),
);

/**
 * One owner-warn slot at a time. The trio used to be set in a single call, so the
 * "all three must differ" check compared the three arguments; now it compares the
 * incoming role against whatever the other two slots already hold, which keeps the
 * same guarantee — two owner-warn slots can never point at one role.
 */
export async function handleOwnerWarnSlot(
  interaction: ChatInputCommandInteraction,
  type: RoleConfigType,
): Promise<void> {
  const guild = requireGuild(interaction);
  const M = configMessages.ownerWarns;

  const role = interaction.options.getRole(CommandOption.ROLE, true) as Role;

  if (role.id === guild.id) throw new CommandError(M.everyone);
  if (role.managed) throw new CommandError(M.managed(role.id));

  const me = guild.members.me;
  if (me && me.roles.highest.comparePositionTo(role) <= 0) {
    throw new CommandError(M.unmanageable(role.id));
  }

  const hierarchy = await getHierarchy(guild.id);
  if (hierarchy.levelByRoleId.has(role.id)) throw new CommandError(M.onLadder(role.id));

  const current = await roleConfigService.get(guild.id, role.id);
  if (current && current.type !== type) {
    if (OWNER_WARN_SLOTS.includes(current.type)) throw new CommandError(M.duplicate);
    if (RESERVED_TYPES.includes(current.type)) {
      throw new CommandError(M.reserved(role.id, ROLE_SLOT_LABELS[current.type]));
    }
  }

  await roleConfigService.setRole({ guildId: guild.id, roleId: role.id, type });

  const configured = await Promise.all(
    OWNER_WARN_SLOTS.map((slot) => roleConfigService.getByType(guild.id, slot)),
  );

  await replySuccess(
    interaction,
    M.configured,
    ...OWNER_WARN_SLOTS.map((slot, index) => {
      const level = OWNER_WARN_LEVEL[slot] ?? index + 1;
      const row = configured[index];
      return row ? M.line(level, row.roleId) : M.lineUnset(level);
    }),
    M.note,
  );
}
