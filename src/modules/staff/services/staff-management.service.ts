import type { GuildMember } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { staffService } from "./staff.service.ts";
import { staffActivityService } from "./staff-activity.service.ts";
import { staffHistoryService } from "./staff-history.service.ts";
import { StaffActivityType, StaffHistoryAction, StaffStatus } from "../types/enums.ts";
import {
  maxLadderLevel,
  rawDemoteLevel,
  resolveAcceptLevel,
  resolvePromoteLevel,
  rolesAbove,
  rolesUpTo,
  type LadderRung,
} from "./staff-level-math.ts";
import {
  staffManagementAuthorizationService,
  type AuthorizationDecision,
} from "./staff-management-authorization.service.ts";
import { staffAcceptedRoleService } from "./staff-accepted-role.service.ts";
import { staffRoleAssignmentService } from "./staff-role-assignment.service.ts";
import { syncStaffRoles } from "./staff-role-sync.service.ts";
import { staffTypeService } from "./staff-type.service.ts";
import type { StaffType } from "../types/enums.ts";

const log = logger.child("staff-mgmt");

export type StaffActor =
  | { kind: "MEMBER"; member: GuildMember }
  | { kind: "SYSTEM"; id: string };

export function memberActor(member: GuildMember): StaffActor {
  return { kind: "MEMBER", member };
}

export const SYSTEM_ACTOR: StaffActor = { kind: "SYSTEM", id: "SYSTEM" };

export function preauthorizedActor(id: string): StaffActor {
  return { kind: "SYSTEM", id };
}

function actorId(actor: StaffActor): string {
  return actor.kind === "MEMBER" ? actor.member.id : actor.id;
}

function enforce(decision: AuthorizationDecision): void {
  if (!decision.allowed) throw new StaffAdminError(decision.message);
}

async function cancelOpenVacationSnapshot(
  guildId: string,
  staffId: string,
  endedBy: string,
): Promise<void> {
  try {
    const { VacationModel } = await import("../../vacation/models/vacation.model.ts");
    const { VacationStatus } = await import("../../vacation/types/enums.ts");
    await VacationModel.updateMany(
      { guildId, staffId, isOpen: true },
      {
        $set: {
          status: VacationStatus.CANCELLED,
          isOpen: false,
          endedBy,
          endedAt: new Date(),
          rolesRestored: false,
          savedRoleIds: [],
          savedAccessRoleIds: [],
          savedAcceptedRoleIds: [],
          savedAssignedRoleIds: [],
          savedTypeRoleIds: [],
        },
      },
    ).exec();
  } catch (err) {
    log.warn(`clearing vacation snapshot for ${staffId} in ${guildId} failed`, err);
  }
}

async function syncWarningRolesForTier(member: GuildMember, reason: string): Promise<void> {
  try {
    const { warningActionService } = await import(
      "../../warnings/services/warning-actions.service.ts"
    );
    await warningActionService.syncWarningCategoryRoles(member, reason);
  } catch (err) {
    log.warn(`warning category sync failed for ${member.id}`, err);
  }
}

export interface AcceptResult {
  level: number;
  previousLevel: number;

  staffType: StaffType | null;
}
export interface FireResult {
  blacklist: boolean;
}
export interface LevelChangeResult {
  from: number;
  to: number;
  changed: boolean;
}

class StaffAdminError extends DomainError {
  constructor(message: string) {
    super("STAFF_ADMIN", message);
  }
}

async function ladderFor(guildId: string): Promise<LadderRung[]> {
  const rows = await roleConfigService.getStaffRoleLevels(guildId);
  return rows.map((r) => ({ roleId: r.roleId, level: r.level }));
}

async function applyRoles(
  member: GuildMember,
  add: readonly string[],
  remove: readonly string[],
  reason: string,
): Promise<void> {
  const guildRoleIds = member.guild.roles.cache;
  const toAdd = [...new Set(add)].filter((id) => guildRoleIds.has(id) && !member.roles.cache.has(id));
  const toRemove = [...new Set(remove)].filter(
    (id) => guildRoleIds.has(id) && member.roles.cache.has(id) && !add.includes(id),
  );
  if (toAdd.length) await member.roles.add(toAdd, reason).catch((err) => log.warn("role add failed", err));
  if (toRemove.length) await member.roles.remove(toRemove, reason).catch((err) => log.warn("role remove failed", err));
}

export class StaffManagementService {
  async accept(
    member: GuildMember,
    actor: StaffActor,
    requestedLevel: number | null,
    staffType: StaffType | null = null,
  ): Promise<AcceptResult> {
    const guildId = member.guild.id;
    const ladder = await ladderFor(guildId);
    if (ladder.length === 0) throw new StaffAdminError(prefixMessages.staff.rolesNotConfigured);

    const level = resolveAcceptLevel(requestedLevel, ladder);
    if (level === null) {
      throw new StaffAdminError(prefixMessages.staff.levelOutOfRange(maxLadderLevel(ladder)));
    }

    if (actor.kind === "MEMBER") {
      enforce(
        await staffManagementAuthorizationService.canAccept(actor.member, member, level),
      );
    }

    const existing = await staffService.get(member.id, guildId);
    const staff = existing ?? (await staffService.ensure(member.id, guildId));
    const previousLevel = existing?.currentRoleLevel ?? 0;

    await staffService.update(staff._id, {
      status: StaffStatus.ACTIVE,
      currentRoleLevel: level,
      acceptedBy: actorId(actor),
      acceptedAt: new Date(),

      ...(staffType ? { staffType } : {}),
    });

    await syncStaffRoles(member, level, `Accepted as staff by ${actorId(actor)}`, {
      clearBlacklist: true,
    });

    if (staffType) {
      await staffTypeService.assignType(
        member,
        staffType,
        `Accepted as ${staffType} staff by ${actorId(actor)}`,
      );
    }

    await staffHistoryService.record({
      staffId: staff._id,
      action: StaffHistoryAction.ACCEPT,
      performedBy: actorId(actor),
      previousRoleLevel: previousLevel,
      newRoleLevel: level,

      metadata: { staffType: staffType ?? null },
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.ACCEPT,
      referenceId: member.id,
      metadata: { level, staffType: staffType ?? null },
    });

    return { level, previousLevel, staffType };
  }

  async fire(member: GuildMember, actor: StaffActor, blacklist: boolean): Promise<FireResult> {
    const guildId = member.guild.id;
    const staff = await staffService.get(member.id, guildId);
    if (!staff) throw new StaffAdminError(prefixMessages.staff.notStaffMember(`<@${member.id}>`));

    if (actor.kind === "MEMBER") {
      enforce(
        await staffManagementAuthorizationService.canFire(
          actor.member,
          member,
          staff.currentRoleLevel,
        ),
      );
    }

    const ladder = await ladderFor(guildId);
    const general = await roleConfigService.getGeneralStaffRoleId(guildId);
    const blacklistRole = await roleConfigService.getByType(guildId, RoleConfigType.BLACKLIST);
    if (blacklist && !blacklistRole) {
      throw new StaffAdminError(prefixMessages.staff.blacklistRoleMissing);
    }
    const warnRoles = await Promise.all([
      roleConfigService.getByType(guildId, RoleConfigType.WARN_1),
      roleConfigService.getByType(guildId, RoleConfigType.WARN_2),
      roleConfigService.getByType(guildId, RoleConfigType.WARN_3),
    ]);

    const accessRoleIds = await roleConfigService.getAccessRoleIds(guildId);
    const acceptedConfig = await staffAcceptedRoleService.getConfig(guildId);

    const remove = [
      ...ladder.map((r) => r.roleId),
      ...(general ? [general] : []),
      ...accessRoleIds,
      ...(acceptedConfig ? [acceptedConfig.roleId] : []),

      ...(await staffRoleAssignmentService.getManagedRoleIds(guildId)),

      ...(await staffTypeService.getManagedRoleIds(guildId)),
      ...warnRoles.filter((r): r is NonNullable<typeof r> => !!r).map((r) => r.roleId),
      ...(!blacklist && blacklistRole ? [blacklistRole.roleId] : []),
    ];
    const add = blacklist && blacklistRole ? [blacklistRole.roleId] : [];
    await applyRoles(member, add, remove, `Fired by ${actorId(actor)}`);

    await staffService.update(staff._id, {
      status: blacklist ? StaffStatus.BLACKLISTED : StaffStatus.FIRED,
      firedBy: actorId(actor),
      firedAt: new Date(),

      staffType: null,
    });
    await staffHistoryService.record({
      staffId: staff._id,
      action: blacklist ? StaffHistoryAction.BLACKLIST : StaffHistoryAction.FIRE,
      performedBy: actorId(actor),
      previousRoleLevel: staff.currentRoleLevel,
      newRoleLevel: 0,
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.FIRE,
      referenceId: member.id,
      metadata: { blacklist },
    });

    await cancelOpenVacationSnapshot(guildId, member.id, actorId(actor));

    return { blacklist };
  }

  async promote(
    member: GuildMember,
    actor: StaffActor,
    amount: number | null,
  ): Promise<LevelChangeResult> {
    return this.changeLevel(member, actor, "promote", amount);
  }

  async demote(
    member: GuildMember,
    actor: StaffActor,
    amount: number | null,
  ): Promise<LevelChangeResult> {
    return this.changeLevel(member, actor, "demote", amount);
  }

  private async changeLevel(
    member: GuildMember,
    actor: StaffActor,
    direction: "promote" | "demote",
    amount: number | null,
  ): Promise<LevelChangeResult> {
    const guildId = member.guild.id;
    const staff = await staffService.get(member.id, guildId);
    if (!staff || staff.status !== StaffStatus.ACTIVE) {
      throw new StaffAdminError(prefixMessages.staff.notStaffMember(`<@${member.id}>`));
    }
    const ladder = await ladderFor(guildId);
    if (ladder.length === 0) throw new StaffAdminError(prefixMessages.staff.rolesNotConfigured);

    const from = staff.currentRoleLevel;
    const to =
      direction === "promote"
        ? resolvePromoteLevel(from, amount, ladder)
        : rawDemoteLevel(from, amount);

    if (actor.kind === "MEMBER") {
      enforce(
        direction === "promote"
          ? await staffManagementAuthorizationService.canPromote(actor.member, member, to, from)
          : await staffManagementAuthorizationService.canDemote(actor.member, member, to, from),
      );
    }

    if (direction === "demote" && to < 0) {
      throw new StaffAdminError(staffMessages.authorization.BELOW_MIN_LEVEL);
    }

    if (to === from) return { from, to, changed: false };

    await syncStaffRoles(member, to, `${direction} by ${actorId(actor)}`);

    await syncWarningRolesForTier(member, `${direction} by ${actorId(actor)}`);

    await staffService.setRoleLevel(staff._id, to);
    await staffHistoryService.record({
      staffId: staff._id,
      action: direction === "promote" ? StaffHistoryAction.PROMOTE : StaffHistoryAction.DEMOTE,
      performedBy: actorId(actor),
      previousRoleLevel: from,
      newRoleLevel: to,
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: direction === "promote" ? StaffActivityType.PROMOTE : StaffActivityType.DEMOTE,
      referenceId: member.id,
      metadata: { from, to },
    });

    return { from, to, changed: true };
  }
}

export const staffManagementService = new StaffManagementService();
