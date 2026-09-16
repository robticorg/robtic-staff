import type { ChatInputCommandInteraction, Role } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import { roleConfigService } from "../../modules/configuration/index.ts";
import { RoleConfigType } from "../../modules/configuration/types/enums.ts";
import { getHierarchy } from "../../modules/configuration/utils/staff-levels.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "./responses.ts";

const SLOTS = [
  { option: CommandOption.WARN_1, type: RoleConfigType.OWNER_WARN_1, level: 1 },
  { option: CommandOption.WARN_2, type: RoleConfigType.OWNER_WARN_2, level: 2 },
  { option: CommandOption.WARN_3, type: RoleConfigType.OWNER_WARN_3, level: 3 },
] as const;

const RESERVED_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.START,
  RoleConfigType.END,
  RoleConfigType.STAFF,
  RoleConfigType.IGNORE,
  RoleConfigType.ACCESS,
  RoleConfigType.ACCEPTED,
  RoleConfigType.ASSIGN,
  RoleConfigType.STAFF_TYPE,
  RoleConfigType.BLACKLIST,
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.OWNER_MANAGER,
  RoleConfigType.TRANSFER_MANAGER,
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.VACATION,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.TAG,
];

export async function handleOwnerWarns(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = requireGuild(interaction);
  const M = configMessages.ownerWarns;

  const roles = SLOTS.map((slot) => ({
    ...slot,
    role: interaction.options.getRole(slot.option, true) as Role,
  }));

  const ids = roles.map((r) => r.role.id);
  if (new Set(ids).size !== ids.length) throw new CommandError(M.duplicate);

  for (const { role } of roles) {
    if (role.id === guild.id) throw new CommandError(M.everyone);
    if (role.managed) throw new CommandError(M.managed(role.id));

    const me = guild.members.me;
    if (me && me.roles.highest.comparePositionTo(role) <= 0) {
      throw new CommandError(M.unmanageable(role.id));
    }
  }

  const hierarchy = await getHierarchy(guild.id);
  for (const { role } of roles) {
    if (hierarchy.levelByRoleId.has(role.id)) throw new CommandError(M.onLadder(role.id));

    const current = await roleConfigService.get(guild.id, role.id);
    if (!current) continue;

    const isOwnWarnSlot =
      current.type === RoleConfigType.OWNER_WARN_1 ||
      current.type === RoleConfigType.OWNER_WARN_2 ||
      current.type === RoleConfigType.OWNER_WARN_3;
    if (isOwnWarnSlot) continue;
    if (RESERVED_TYPES.includes(current.type)) {
      throw new CommandError(M.reserved(role.id, ROLE_SLOT_LABELS[current.type]));
    }
  }

  for (const { role, type } of roles) {
    await roleConfigService.setRole({ guildId: guild.id, roleId: role.id, type });
  }

  await replySuccess(
    interaction,
    M.configured,
    ...roles.map(({ role, level }) => M.line(level, role.id)),
    M.note,
  );
}
