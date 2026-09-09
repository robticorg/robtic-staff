import type { Guild, Role } from "discord.js";
import type { RoleId } from "../../shared/types/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { CommandError } from "../_shared/guards.ts";

export interface LadderInput {
  guild: Guild;
  startRoleId: RoleId;
  endRoleId: RoleId;

  excludedRoleIds: Iterable<RoleId>;
}

export function buildStaffLadder(input: LadderInput): RoleId[] {
  const { guild } = input;

  const startRole = guild.roles.cache.get(input.startRoleId);
  if (!startRole) {
    throw new CommandError(configMessages.role.startRoleMissing);
  }
  const endRole = guild.roles.cache.get(input.endRoleId);
  if (!endRole) {
    throw new CommandError(configMessages.role.endRoleNotFound);
  }

  if (startRole.id === endRole.id) {
    return [startRole.id];
  }
  if (endRole.position <= startRole.position) {
    throw new CommandError(configMessages.role.endBelowStart);
  }

  const excluded = new Set<RoleId>(input.excludedRoleIds);
  excluded.delete(startRole.id);
  excluded.delete(endRole.id);

  const inRange = [...guild.roles.cache.values()].filter((role: Role) => {
    if (role.id === guild.id) return false;
    if (role.id === startRole.id || role.id === endRole.id) return true;
    if (role.position < startRole.position || role.position > endRole.position) return false;
    if (excluded.has(role.id)) return false;
    if (role.managed) return false;
    return true;
  });

  inRange.sort((a, b) => a.position - b.position);

  const ordered = inRange.map((r) => r.id);

  const withoutEnds = ordered.filter((id) => id !== startRole.id && id !== endRole.id);
  return [startRole.id, ...withoutEnds, endRole.id];
}
