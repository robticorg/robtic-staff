import type { GuildMember } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { staffService } from "./staff.service.ts";
import { staffActivityService } from "./staff-activity.service.ts";
import { staffHistoryService } from "./staff-history.service.ts";
import { StaffActivityType, StaffHistoryAction, StaffStatus } from "../types/enums.ts";
import {
  maxLadderLevel,
  resolveAcceptLevel,
  resolveDemoteLevel,
  resolvePromoteLevel,
  rolesAbove,
  rolesUpTo,
  type LadderRung,
} from "./staff-level-math.ts";

const log = logger.child("staff-mgmt");

export interface AcceptResult {
  level: number;
  previousLevel: number;
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
    actorId: string,
    requestedLevel: number | null,
  ): Promise<AcceptResult> {
    const guildId = member.guild.id;
    const ladder = await ladderFor(guildId);
    if (ladder.length === 0) throw new StaffAdminError(prefixMessages.staff.rolesNotConfigured);

    const level = resolveAcceptLevel(requestedLevel, ladder);
    if (level === null) {
      throw new StaffAdminError(prefixMessages.staff.levelOutOfRange(maxLadderLevel(ladder)));
    }

    const existing = await staffService.get(member.id, guildId);
    const staff = existing ?? (await staffService.ensure(member.id, guildId));
    const previousLevel = existing?.currentRoleLevel ?? 0;

    await staffService.update(staff._id, {
      status: StaffStatus.ACTIVE,
      currentRoleLevel: level,
      acceptedBy: actorId,
      acceptedAt: new Date(),
    });

    const general = await roleConfigService.getGeneralStaffRoleId(guildId);
    const blacklistRole = await roleConfigService.getByType(guildId, RoleConfigType.BLACKLIST);

    const add = [...rolesUpTo(ladder, level), ...(general ? [general] : [])];
    const remove = [
      ...rolesAbove(ladder, level),
      ...(blacklistRole ? [blacklistRole.roleId] : []),
    ];
    await applyRoles(member, add, remove, `Accepted as staff by ${actorId}`);

    await staffHistoryService.record({
      staffId: staff._id,
      action: StaffHistoryAction.ACCEPT,
      performedBy: actorId,
      previousRoleLevel: previousLevel,
      newRoleLevel: level,
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.ACCEPT,
      referenceId: member.id,
      metadata: { level },
    });

    return { level, previousLevel };
  }

  async fire(member: GuildMember, actorId: string, blacklist: boolean): Promise<FireResult> {
    const guildId = member.guild.id;
    const staff = await staffService.get(member.id, guildId);
    if (!staff) throw new StaffAdminError(prefixMessages.staff.notStaffMember(`<@${member.id}>`));

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

    const remove = [
      ...ladder.map((r) => r.roleId),
      ...(general ? [general] : []),
      ...warnRoles.filter((r): r is NonNullable<typeof r> => !!r).map((r) => r.roleId),
      ...(!blacklist && blacklistRole ? [blacklistRole.roleId] : []),
    ];
    const add = blacklist && blacklistRole ? [blacklistRole.roleId] : [];
    await applyRoles(member, add, remove, `Fired by ${actorId}`);

    await staffService.update(staff._id, {
      status: blacklist ? StaffStatus.BLACKLISTED : StaffStatus.FIRED,
      firedBy: actorId,
      firedAt: new Date(),
    });
    await staffHistoryService.record({
      staffId: staff._id,
      action: blacklist ? StaffHistoryAction.BLACKLIST : StaffHistoryAction.FIRE,
      performedBy: actorId,
      previousRoleLevel: staff.currentRoleLevel,
      newRoleLevel: 0,
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.FIRE,
      referenceId: member.id,
      metadata: { blacklist },
    });

    return { blacklist };
  }

  async promote(
    member: GuildMember,
    actorId: string,
    amount: number | null,
  ): Promise<LevelChangeResult> {
    return this.changeLevel(member, actorId, "promote", amount);
  }

  async demote(
    member: GuildMember,
    actorId: string,
    amount: number | null,
  ): Promise<LevelChangeResult> {
    return this.changeLevel(member, actorId, "demote", amount);
  }

  private async changeLevel(
    member: GuildMember,
    actorId: string,
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
        : resolveDemoteLevel(from, amount);

    if (to === from) return { from, to, changed: false };

    const general = await roleConfigService.getGeneralStaffRoleId(guildId);
    const add = [...rolesUpTo(ladder, to), ...(general ? [general] : [])];
    const remove = rolesAbove(ladder, to);
    await applyRoles(member, add, remove, `${direction} by ${actorId}`);

    await staffService.setRoleLevel(staff._id, to);
    await staffHistoryService.record({
      staffId: staff._id,
      action: direction === "promote" ? StaffHistoryAction.PROMOTE : StaffHistoryAction.DEMOTE,
      performedBy: actorId,
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
