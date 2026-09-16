import type { Guild, GuildMember, Role } from "discord.js";
import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import {
  STAFF_TYPE_BY_ID,
  STAFF_TYPE_BY_KEYWORD,
  STAFF_TYPE_DEFINITIONS,
  STAFF_TYPE_SLUGS,
  type StaffTypeDefinition,
} from "../../../data/staff-types/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { getHierarchy } from "../../configuration/utils/staff-levels.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffType } from "../types/enums.ts";

const log = logger.child("staff:types");

export const StaffTypeProblem = {
  UNKNOWN_TYPE: "UNKNOWN_TYPE",
  EVERYONE: "EVERYONE",
  MANAGED: "MANAGED",
  UNMANAGEABLE: "UNMANAGEABLE",
  MISSING: "MISSING",

  RESERVED: "RESERVED",
} as const;
export type StaffTypeProblem = (typeof StaffTypeProblem)[keyof typeof StaffTypeProblem];

export class StaffTypeError extends ValidationError {
  constructor(
    public readonly problem: StaffTypeProblem,
    context?: Record<string, unknown>,
  ) {
    super(problem, { problem, ...context });
  }
}

export interface ConfiguredStaffType {
  staffType: StaffType;
  roleId: RoleId;
}

const OVERWRITABLE_SLOTS: ReadonlySet<RoleConfigType> = new Set([
  RoleConfigType.STAFF_TYPE,
  RoleConfigType.IGNORE,
]);

export class StaffTypeService {
  getAvailableTypes(): readonly StaffTypeDefinition[] {
    return STAFF_TYPE_DEFINITIONS;
  }

  getAvailableKeywords(): readonly string[] {
    return STAFF_TYPE_SLUGS;
  }

  resolveKeyword(keyword: string): StaffType | null {
    return STAFF_TYPE_BY_KEYWORD.get(keyword.trim().toLowerCase()) ?? null;
  }

  isValidType(value: unknown): value is StaffType {
    return typeof value === "string" && value in STAFF_TYPE_BY_ID;
  }

  definition(staffType: StaffType): StaffTypeDefinition | undefined {
    return STAFF_TYPE_BY_ID[staffType];
  }

  async getConfiguredRole(guildId: GuildId, staffType: StaffType): Promise<RoleId | null> {
    const row = await RoleConfigModel.findOne({
      guildId,
      type: RoleConfigType.STAFF_TYPE,
      staffType,
    })
      .select({ roleId: 1 })
      .exec();
    return row?.roleId ?? null;
  }

  async getConfiguredRoles(guildId: GuildId): Promise<ConfiguredStaffType[]> {
    const rows = await RoleConfigModel.find({ guildId, type: RoleConfigType.STAFF_TYPE })
      .select({ roleId: 1, staffType: 1 })
      .exec();
    return rows
      .filter((row): row is typeof row & { staffType: StaffType } => !!row.staffType)
      .map((row) => ({ staffType: row.staffType, roleId: row.roleId }));
  }

  async getManagedRoleIds(guildId: GuildId): Promise<RoleId[]> {
    return (await this.getConfiguredRoles(guildId)).map((r) => r.roleId);
  }

  async configureRole(
    guild: Guild,
    staffType: StaffType,
    role: Role,
  ): Promise<ConfiguredStaffType> {
    const guildId = guild.id;

    if (!this.isValidType(staffType)) {
      throw new StaffTypeError(StaffTypeProblem.UNKNOWN_TYPE, { staffType });
    }
    if (!role) throw new StaffTypeError(StaffTypeProblem.MISSING);
    if (role.id === guildId) throw new StaffTypeError(StaffTypeProblem.EVERYONE);
    if (role.managed) throw new StaffTypeError(StaffTypeProblem.MANAGED);

    const me = guild.members.me;
    if (me && me.roles.highest.comparePositionTo(role) <= 0) {
      throw new StaffTypeError(StaffTypeProblem.UNMANAGEABLE, { roleId: role.id });
    }

    const current = await roleConfigService.get(guildId, role.id);
    if (current && !OVERWRITABLE_SLOTS.has(current.type)) {
      throw new StaffTypeError(StaffTypeProblem.RESERVED, {
        roleId: role.id,
        conflict: current.type,
      });
    }

    const hierarchy = await getHierarchy(guildId);
    if (hierarchy.levelByRoleId.has(role.id) || hierarchy.generalStaffRoleId === role.id) {
      throw new StaffTypeError(StaffTypeProblem.RESERVED, {
        roleId: role.id,
        conflict: RoleConfigType.STAFF,
      });
    }

    await RoleConfigModel.deleteMany({
      guildId,
      type: RoleConfigType.STAFF_TYPE,
      staffType,
      roleId: { $ne: role.id },
    }).exec();

    await RoleConfigModel.findOneAndUpdate(
      { guildId, roleId: role.id },
      {
        $set: { type: RoleConfigType.STAFF_TYPE, staffType },

        $unset: { level: "", boundary: "", rangeFromLevel: "", rangeToLevel: "" },
      },
      { upsert: true, returnDocument: "after" },
    ).exec();

    await roleConfigService.touchGuild(guildId);
    log.info(`staff type ${staffType} bound to role ${role.id} in ${guildId}`);

    return { staffType, roleId: role.id };
  }

  async removeConfiguredRole(guildId: GuildId, staffType: StaffType): Promise<boolean> {
    const result = await RoleConfigModel.deleteMany({
      guildId,
      type: RoleConfigType.STAFF_TYPE,
      staffType,
    }).exec();
    const removed = (result.deletedCount ?? 0) > 0;
    if (removed) await roleConfigService.touchGuild(guildId);
    return removed;
  }

  async getType(guildId: GuildId, userId: UserId): Promise<StaffType | null> {
    const staff = await StaffModel.findOne({ guildId, userId }).select({ staffType: 1 }).exec();
    return staff?.staffType ?? null;
  }

  async getTypeFromRoles(member: GuildMember): Promise<StaffType | null> {
    const configured = await this.getConfiguredRoles(member.guild.id);
    return configured.find((c) => member.roles.cache.has(c.roleId))?.staffType ?? null;
  }

  async heldTypeRoleIds(member: GuildMember): Promise<RoleId[]> {
    const configured = await this.getConfiguredRoles(member.guild.id);
    return configured.filter((c) => member.roles.cache.has(c.roleId)).map((c) => c.roleId);
  }

  async applyType(
    member: GuildMember,
    staffType: StaffType | null,
    reason: string,
  ): Promise<{ added: RoleId | null; removed: RoleId[] }> {
    const configured = await this.getConfiguredRoles(member.guild.id);
    if (configured.length === 0) return { added: null, removed: [] };

    const guildRoles = member.guild.roles.cache;
    const target = staffType ? (configured.find((c) => c.staffType === staffType) ?? null) : null;

    const toRemove = configured
      .filter((c) => c.staffType !== staffType)
      .map((c) => c.roleId)
      .filter((id) => guildRoles.has(id) && member.roles.cache.has(id));

    const toAdd =
      target && guildRoles.has(target.roleId) && !member.roles.cache.has(target.roleId)
        ? target.roleId
        : null;

    if (toRemove.length > 0) {
      await member.roles
        .remove(toRemove, reason)
        .catch((err) => log.warn("staff type role removal failed", err));
    }
    if (toAdd) {
      await member.roles
        .add(toAdd, reason)
        .catch((err) => log.warn("staff type role assignment failed", err));
    }

    return { added: toAdd, removed: toRemove };
  }

  assignType(member: GuildMember, staffType: StaffType, reason: string) {
    return this.applyType(member, staffType, reason);
  }

  replaceType(member: GuildMember, staffType: StaffType, reason: string) {
    return this.applyType(member, staffType, reason);
  }

  removeType(member: GuildMember, reason: string) {
    return this.applyType(member, null, reason);
  }
}

export const staffTypeService = new StaffTypeService();
export { StaffType };
