import type { Guild, GuildMember, Role } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { getHierarchy } from "../../configuration/utils/staff-levels.ts";
import {
  AcceptedRoleError,
  AcceptedRoleProblem,
} from "./staff-accepted-role.service.ts";

const log = logger.child("staff:assignments");

export interface StaffRoleAssignment {
  roleId: RoleId;

  fromLevel: number | null;
  toLevel: number | null;
}

export interface ConfigureAssignmentInput {
  guild: Guild;
  role: Role;
  fromRole?: Role | null;
  toRole?: Role | null;
}

export class StaffRoleAssignmentService {
  async getAssignments(guildId: GuildId): Promise<StaffRoleAssignment[]> {
    const rows = await RoleConfigModel.find({ guildId, type: RoleConfigType.ASSIGN })
      .select({ roleId: 1, rangeFromLevel: 1, rangeToLevel: 1 })
      .exec();
    return rows.map((row) => ({
      roleId: row.roleId,
      fromLevel: row.rangeFromLevel ?? null,
      toLevel: row.rangeToLevel ?? null,
    }));
  }

  async getManagedRoleIds(guildId: GuildId): Promise<RoleId[]> {
    return (await this.getAssignments(guildId)).map((a) => a.roleId);
  }

  appliesToLevel(assignment: StaffRoleAssignment, level: number): boolean {
    if (assignment.fromLevel === null || assignment.toLevel === null) return true;
    return level >= assignment.fromLevel && level <= assignment.toLevel;
  }

  async getAssignmentsForLevel(
    guildId: GuildId,
    level: number,
  ): Promise<StaffRoleAssignment[]> {
    return (await this.getAssignments(guildId)).filter((a) => this.appliesToLevel(a, level));
  }

  async getRequiredRolesForLevel(guildId: GuildId, level: number): Promise<RoleId[]> {
    return (await this.getAssignmentsForLevel(guildId, level)).map((a) => a.roleId);
  }

  async shouldHaveRole(guildId: GuildId, roleId: RoleId, level: number): Promise<boolean> {
    const assignment = (await this.getAssignments(guildId)).find((a) => a.roleId === roleId);
    return assignment ? this.appliesToLevel(assignment, level) : false;
  }

  async configureAssignment(input: ConfigureAssignmentInput): Promise<StaffRoleAssignment> {
    const { guild, role, fromRole, toRole } = input;
    const guildId = guild.id;

    if (!role) throw new AcceptedRoleError(AcceptedRoleProblem.ROLE_REQUIRED);
    if (fromRole && !toRole) throw new AcceptedRoleError(AcceptedRoleProblem.FROM_WITHOUT_TO);
    if (toRole && !fromRole) throw new AcceptedRoleError(AcceptedRoleProblem.TO_WITHOUT_FROM);

    if (role.id === guildId) throw new AcceptedRoleError(AcceptedRoleProblem.EVERYONE);
    if (role.managed) throw new AcceptedRoleError(AcceptedRoleProblem.MANAGED);

    const me = guild.members.me;
    if (me && me.roles.highest.comparePositionTo(role) <= 0) {
      throw new AcceptedRoleError(AcceptedRoleProblem.UNMANAGEABLE, { roleId: role.id });
    }

    const current = await roleConfigService.get(guildId, role.id);
    if (current && current.type !== RoleConfigType.ASSIGN) {
      throw new AcceptedRoleError(AcceptedRoleProblem.RESERVED, {
        roleId: role.id,
        conflict: current.type,
      });
    }

    let fromLevel: number | null = null;
    let toLevel: number | null = null;

    if (fromRole && toRole) {
      const hierarchy = await getHierarchy(guildId);
      const resolvedFrom = hierarchy.levelByRoleId.get(fromRole.id);
      const resolvedTo = hierarchy.levelByRoleId.get(toRole.id);

      if (resolvedFrom === undefined) {
        throw new AcceptedRoleError(AcceptedRoleProblem.FROM_NOT_NUMBERED, {
          roleId: fromRole.id,
        });
      }
      if (resolvedTo === undefined) {
        throw new AcceptedRoleError(AcceptedRoleProblem.TO_NOT_NUMBERED, { roleId: toRole.id });
      }
      if (resolvedFrom > resolvedTo) {
        throw new AcceptedRoleError(AcceptedRoleProblem.RANGE_INVERTED, {
          fromLevel: resolvedFrom,
          toLevel: resolvedTo,
        });
      }
      fromLevel = resolvedFrom;
      toLevel = resolvedTo;
    }

    await RoleConfigModel.findOneAndUpdate(
      { guildId, roleId: role.id },
      {
        $set: {
          type: RoleConfigType.ASSIGN,
          ...(fromLevel === null ? {} : { rangeFromLevel: fromLevel }),
          ...(toLevel === null ? {} : { rangeToLevel: toLevel }),
        },
        $unset: {
          level: "",
          boundary: "",
          ...(fromLevel === null ? { rangeFromLevel: "", rangeToLevel: "" } : {}),
        },
      },
      { upsert: true, returnDocument: "after" },
    ).exec();

    await roleConfigService.touchGuild(guildId);
    log.info(
      `assignment ${role.id} configured in ${guildId} (range ${fromLevel ?? "*"}..${toLevel ?? "*"})`,
    );

    return { roleId: role.id, fromLevel, toLevel };
  }

  async removeAssignment(guildId: GuildId, roleId: RoleId): Promise<boolean> {
    const result = await RoleConfigModel.deleteOne({
      guildId,
      roleId,
      type: RoleConfigType.ASSIGN,
    }).exec();
    const removed = (result.deletedCount ?? 0) > 0;
    if (removed) await roleConfigService.touchGuild(guildId);
    return removed;
  }

  async resolveForLevel(
    guildId: GuildId,
    level: number,
  ): Promise<{ add: RoleId[]; remove: RoleId[] }> {
    const assignments = await this.getAssignments(guildId);
    const add: RoleId[] = [];
    const remove: RoleId[] = [];
    for (const assignment of assignments) {
      if (this.appliesToLevel(assignment, level)) add.push(assignment.roleId);
      else remove.push(assignment.roleId);
    }
    return { add, remove };
  }

  async syncAssignedRoles(
    member: GuildMember,
    level: number,
    reason: string,
  ): Promise<{ added: RoleId[]; removed: RoleId[] }> {
    const { add, remove } = await this.resolveForLevel(member.guild.id, level);
    const guildRoles = member.guild.roles.cache;

    const toAdd = add.filter((id) => guildRoles.has(id) && !member.roles.cache.has(id));
    const toRemove = remove.filter((id) => guildRoles.has(id) && member.roles.cache.has(id));

    if (toAdd.length > 0) {
      await member.roles.add(toAdd, reason).catch((err) => log.warn("assign add failed", err));
    }
    if (toRemove.length > 0) {
      await member.roles
        .remove(toRemove, reason)
        .catch((err) => log.warn("assign remove failed", err));
    }
    return { added: toAdd, removed: toRemove };
  }
}

export const staffRoleAssignmentService = new StaffRoleAssignmentService();
