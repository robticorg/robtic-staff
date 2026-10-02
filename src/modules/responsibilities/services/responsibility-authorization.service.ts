import { type GuildMember } from "discord.js";
import { RESPONSIBILITY_ASSIGNERS } from "../../../data/responsibilities/config.ts";
import type { RoleConfigType } from "../../configuration/types/enums.ts";
import type { Responsibility } from "../models/responsibility.model.ts";
import { responsibilityPermissionService } from "./responsibility-permission.service.ts";
import { hasAdminAccess } from "../../access/index.ts";

export interface AssignDecisionInput {
  isAdministrator: boolean;
  heldPermissions: ReadonlySet<string>;
  permission: string;
  isSelf: boolean;
}

export function decideCanAssign(input: AssignDecisionInput): boolean {
  if (input.isAdministrator) return true;
  if (input.isSelf) return false;
  for (const [assigner, grants] of Object.entries(RESPONSIBILITY_ASSIGNERS)) {
    if (input.heldPermissions.has(assigner) && grants?.includes(input.permission as RoleConfigType)) {
      return true;
    }
  }
  return false;
}

export class ResponsibilityAuthorizationService {
  isAdministrator(member: GuildMember): boolean {
    return hasAdminAccess(member);
  }

  async assignerPermissions(executor: GuildMember): Promise<ReadonlySet<string>> {
    const held = new Set<string>();
    for (const assigner of Object.keys(RESPONSIBILITY_ASSIGNERS)) {
      if (await responsibilityPermissionService.holds(executor, assigner as RoleConfigType)) held.add(assigner);
    }
    return held;
  }

  async canManageAny(executor: GuildMember): Promise<boolean> {
    return this.isAdministrator(executor) || (await this.assignerPermissions(executor)).size > 0;
  }

  async canAssign(
    executor: GuildMember,
    targetId: string,
    responsibility: Pick<Responsibility, "permission">,
  ): Promise<boolean> {
    return decideCanAssign({
      isAdministrator: this.isAdministrator(executor),
      heldPermissions: await this.assignerPermissions(executor),
      permission: responsibility.permission,
      isSelf: executor.id === targetId,
    });
  }

  async filterAssignable<T extends Pick<Responsibility, "permission">>(
    executor: GuildMember,
    targetId: string,
    responsibilities: readonly T[],
  ): Promise<T[]> {
    const isAdministrator = this.isAdministrator(executor);
    const heldPermissions = await this.assignerPermissions(executor);
    return responsibilities.filter((r) =>
      decideCanAssign({
        isAdministrator,
        heldPermissions,
        permission: r.permission,
        isSelf: executor.id === targetId,
      }),
    );
  }
}

export const responsibilityAuthorizationService = new ResponsibilityAuthorizationService();
