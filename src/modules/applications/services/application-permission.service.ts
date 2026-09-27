import type { GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import type { Ticket } from "../../tickets/models/ticket.model.ts";
import { memberIsAdministrator } from "../../tickets/services/ticket-permissions.ts";
import { ApplicationError } from "../shared/application-error.ts";
import {
  ApplicantGender,
  ApplicationDepartment,
  ApplicationType,
} from "../shared/enums.ts";
import type { StaffApplication } from "../shared/staff-application.model.ts";

const M = staffApplicationMessages;

const DEPARTMENT_MANAGER: Record<ApplicationDepartment, RoleConfigType> = {
  [ApplicationDepartment.DEVELOPER]: RoleConfigType.DEVELOPER_MANAGER,
  [ApplicationDepartment.DESIGNER]: RoleConfigType.DESIGNER_MANAGER,
  [ApplicationDepartment.EDITOR]: RoleConfigType.EDITOR_MANAGER,
  [ApplicationDepartment.STAFF]: RoleConfigType.APPLY_MANAGER,
};

export type ManagerRouting = Pick<StaffApplication, "type" | "department" | "gender">;

export interface ManagerSlots {
  primary: RoleConfigType;
  fallback: RoleConfigType | null;
  girls: boolean;
}

export function managerSlotsFor(input: ManagerRouting): ManagerSlots {
  const girls = input.gender === ApplicantGender.FEMALE;
  if (input.type === ApplicationType.TRANSFER_APPLICATION) {
    return { primary: RoleConfigType.TRANSFER_MANAGER, fallback: null, girls };
  }
  const primary = DEPARTMENT_MANAGER[input.department ?? ApplicationDepartment.STAFF];
  return {
    primary,
    fallback: primary === RoleConfigType.APPLY_MANAGER ? null : RoleConfigType.APPLY_MANAGER,
    girls,
  };
}

type TicketAccess = Pick<Ticket, "claimableRoles" | "claimedByDiscordId">;

export class ApplicationPermissionService {
  async managerRoleIdsFor(guildId: GuildId, routing: ManagerRouting): Promise<RoleId[]> {
    const slots = managerSlotsFor(routing);
    const primary =
      (await roleConfigService.getByType(guildId, slots.primary)) ??
      (slots.fallback ? await roleConfigService.getByType(guildId, slots.fallback) : null);
    if (!primary) {
      throw new ApplicationError("APPLICATION_MANAGER_ROLE_UNSET", M.create.managerRoleMissing);
    }

    const roleIds = [primary.roleId];
    if (slots.girls) {
      const girls = await roleConfigService.getByType(guildId, RoleConfigType.GIRLS_MANAGER);
      if (girls && !roleIds.includes(girls.roleId)) roleIds.push(girls.roleId);
    }
    return roleIds;
  }

  managerRoleIds(ticket: TicketAccess): RoleId[] {
    return ticket.claimableRoles.map((slot) => slot.roleId);
  }

  holdsManagerRole(member: GuildMember, ticket: TicketAccess): boolean {
    return ticket.claimableRoles.some((slot) => member.roles.cache.has(slot.roleId));
  }

  hasClaimed(member: GuildMember, ticket: TicketAccess): boolean {
    return (
      ticket.claimedByDiscordId === member.id ||
      ticket.claimableRoles.some((slot) => slot.claimedBy === member.id)
    );
  }

  authorizeDecision(
    actor: GuildMember,
    ticket: TicketAccess,
    application: Pick<StaffApplication, "userId">,
  ): void {
    if (actor.id === application.userId) {
      throw new ApplicationError("APPLICATION_SELF_DECISION", M.decision.selfDecision);
    }
    if (memberIsAdministrator(actor)) return;
    if (!this.holdsManagerRole(actor, ticket)) {
      throw new ApplicationError("APPLICATION_NOT_MANAGER", M.decision.notManager);
    }
    if (!this.hasClaimed(actor, ticket)) {
      throw new ApplicationError("APPLICATION_NOT_CLAIMED", M.decision.claimFirst);
    }
  }

  canViewInfo(
    member: GuildMember,
    ticket: TicketAccess,
    application: Pick<StaffApplication, "userId">,
  ): boolean {
    return (
      member.id === application.userId ||
      memberIsAdministrator(member) ||
      this.holdsManagerRole(member, ticket) ||
      this.hasClaimed(member, ticket)
    );
  }
}

export const applicationPermissionService = new ApplicationPermissionService();
