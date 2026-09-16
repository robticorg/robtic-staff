import type { Guild } from "discord.js";
import type { RoleId } from "../../shared/types/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { LadderProblem, orderLadderRoles } from "../../modules/configuration/index.ts";
import { CommandError } from "../_shared/guards.ts";

export interface LadderInput {
  guild: Guild;
  startRoleId: RoleId;
  endRoleId: RoleId;

  excludedRoleIds: Iterable<RoleId>;
}

const PROBLEM_MESSAGES: Record<LadderProblem, string> = {
  [LadderProblem.START_MISSING]: configMessages.role.startRoleMissing,
  [LadderProblem.END_MISSING]: configMessages.role.endRoleNotFound,
  [LadderProblem.END_BELOW_START]: configMessages.role.endBelowStart,
};

export function buildStaffLadder(input: LadderInput): RoleId[] {
  const result = orderLadderRoles({
    roles: input.guild.roles.cache.values(),
    startRoleId: input.startRoleId,
    endRoleId: input.endRoleId,
    everyoneRoleId: input.guild.id,
    excludedRoleIds: input.excludedRoleIds,
  });
  if (!result.ok) throw new CommandError(PROBLEM_MESSAGES[result.problem]);
  return result.ordered;
}
