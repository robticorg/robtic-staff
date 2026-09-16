import type { Guild, GuildMember, Role } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { getHierarchy } from "../../configuration/utils/staff-levels.ts";

const log = logger.child("staff:accepted-role");

export const AcceptedRoleProblem = {
  ROLE_REQUIRED: "ROLE_REQUIRED",
  FROM_WITHOUT_TO: "FROM_WITHOUT_TO",
  TO_WITHOUT_FROM: "TO_WITHOUT_FROM",
  EVERYONE: "EVERYONE",
  MANAGED: "MANAGED",
  UNMANAGEABLE: "UNMANAGEABLE",

  RESERVED: "RESERVED",
  FROM_NOT_NUMBERED: "FROM_NOT_NUMBERED",
  TO_NOT_NUMBERED: "TO_NOT_NUMBERED",
  RANGE_INVERTED: "RANGE_INVERTED",
} as const;
export type AcceptedRoleProblem =
  (typeof AcceptedRoleProblem)[keyof typeof AcceptedRoleProblem];

export class AcceptedRoleError extends ValidationError {
  constructor(
    public readonly problem: AcceptedRoleProblem,
    context?: Record<string, unknown>,
  ) {
    super(problem, { problem, ...context });
  }
}

export interface AcceptedRoleConfig {
  roleId: RoleId;

  fromLevel: number | null;
  toLevel: number | null;
}

export interface ConfigureInput {
  guild: Guild;
  role: Role;
  fromRole?: Role | null;
  toRole?: Role | null;
}

export type SyncOutcome = "added" | "removed" | "unchanged" | "not-configured";

export class StaffAcceptedRoleService {
  async getConfig(guildId: GuildId): Promise<AcceptedRoleConfig | null> {
    const row = await roleConfigService.getByType(guildId, RoleConfigType.ACCEPTED);
    if (!row) return null;
    return {
      roleId: row.roleId,
      fromLevel: row.rangeFromLevel ?? null,
      toLevel: row.rangeToLevel ?? null,
    };
  }

  async configure(input: ConfigureInput): Promise<AcceptedRoleConfig> {
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
    if (current && current.type !== RoleConfigType.ACCEPTED) {
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

    await RoleConfigModel.deleteMany({
      guildId,
      type: RoleConfigType.ACCEPTED,
      roleId: { $ne: role.id },
    }).exec();

    await RoleConfigModel.findOneAndUpdate(
      { guildId, roleId: role.id },
      {
        $set: {
          type: RoleConfigType.ACCEPTED,
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
      `accepted role ${role.id} configured in ${guildId} ` +
        `(range ${fromLevel ?? "*"}..${toLevel ?? "*"})`,
    );

    return { roleId: role.id, fromLevel, toLevel };
  }

  isLevelInRange(config: AcceptedRoleConfig, level: number): boolean {
    if (config.fromLevel === null || config.toLevel === null) return true;
    return level >= config.fromLevel && level <= config.toLevel;
  }

  async shouldHaveAcceptedRole(guildId: GuildId, level: number): Promise<boolean> {
    const config = await this.getConfig(guildId);
    if (!config) return false;
    return this.isLevelInRange(config, level);
  }

  isEligibleForAcceptedRole(guildId: GuildId, level: number): Promise<boolean> {
    return this.shouldHaveAcceptedRole(guildId, level);
  }

  private canManage(member: GuildMember, roleId: RoleId): boolean {
    const me = member.guild.members.me;
    const role = member.guild.roles.cache.get(roleId);
    if (!me || !role || role.managed) return false;
    return me.roles.highest.comparePositionTo(role) > 0;
  }

  async assignAcceptedRole(member: GuildMember, reason: string): Promise<boolean> {
    const config = await this.getConfig(member.guild.id);
    if (!config) return false;
    if (member.roles.cache.has(config.roleId)) return false;
    if (!this.canManage(member, config.roleId)) {
      log.warn(`cannot assign accepted role ${config.roleId} in ${member.guild.id}`);
      return false;
    }
    try {
      await member.roles.add(config.roleId, reason);
      return true;
    } catch (err) {
      log.error(`accepted role assign failed for ${member.id}`, err);
      return false;
    }
  }

  async removeAcceptedRole(member: GuildMember, reason: string): Promise<boolean> {
    const config = await this.getConfig(member.guild.id);
    if (!config) return false;
    if (!member.roles.cache.has(config.roleId)) return false;
    if (!this.canManage(member, config.roleId)) {
      log.warn(`cannot remove accepted role ${config.roleId} in ${member.guild.id}`);
      return false;
    }
    try {
      await member.roles.remove(config.roleId, reason);
      return true;
    } catch (err) {
      log.error(`accepted role removal failed for ${member.id}`, err);
      return false;
    }
  }

  async syncAcceptedRole(
    member: GuildMember,
    level: number,
    reason: string,
  ): Promise<SyncOutcome> {
    const config = await this.getConfig(member.guild.id);
    if (!config) return "not-configured";

    const eligible = this.isLevelInRange(config, level);
    const has = member.roles.cache.has(config.roleId);

    if (eligible && !has) return (await this.assignAcceptedRole(member, reason)) ? "added" : "unchanged";
    if (!eligible && has) return (await this.removeAcceptedRole(member, reason)) ? "removed" : "unchanged";
    return "unchanged";
  }
}

export const staffAcceptedRoleService = new StaffAcceptedRoleService();
