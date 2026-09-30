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
  resolveAcceptLevel,
  resolveMove,
  rolesAbove,
  rolesUpTo,
  type LadderRung,
  type LevelMove,
} from "./staff-level-math.ts";
import {
  staffManagementAuthorizationService,
  type AuthorizationDecision,
} from "./staff-management-authorization.service.ts";
import { staffAcceptedRoleService } from "./staff-accepted-role.service.ts";
import { staffRoleAssignmentService } from "./staff-role-assignment.service.ts";
import { planStaffRoles, syncStaffRoles } from "./staff-role-sync.service.ts";
import { heldIgnoredRoles } from "./staff-role-snapshot.ts";
import { StaffHistoryModel } from "../models/staff-history.model.ts";
import { staffIdentityRequirementService } from "../../staff-identity/index.ts";
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

  /** Accepted without a server tag or identifier in their name — roles are held until they add one. */
  awaitingIdentity: { dmSent: boolean } | null;
}
export type ReinstateResult =
  | { outcome: "no-record" | "blacklisted" | "on-break" }
  | { outcome: "nothing-to-do"; level: number }
  | {
      outcome: "reinstated";
      level: number;
      wasFired: boolean;
      awaitingIdentity: AcceptResult["awaitingIdentity"];
    };

export interface FireResult {
  blacklist: boolean;
}
export interface LevelChangeResult {
  from: number;
  to: number;
  changed: boolean;
  /** An explicit target level pointed the other way (see resolveMove) — nothing changed. */
  wrongWay?: boolean;
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
    provenance: Record<string, unknown> = {},
    options: { managerRoleIds?: readonly string[] } = {},
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
        options.managerRoleIds
          ? await staffManagementAuthorizationService.canAcceptApplication(
              actor.member,
              member,
              level,
              options.managerRoleIds,
            )
          : await staffManagementAuthorizationService.canAccept(actor.member, member, level),
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

    const { awaitingIdentity } = await this.grantOrHoldRoles(
      member,
      level,
      staffType,
      `Accepted as staff by ${actorId(actor)}`,
    );

    await staffHistoryService.record({
      staffId: staff._id,
      action: StaffHistoryAction.ACCEPT,
      performedBy: actorId(actor),
      previousRoleLevel: previousLevel,
      newRoleLevel: level,

      metadata: {
        ...provenance,
        staffType: staffType ?? null,
        awaitingIdentity: awaitingIdentity !== null,
      },
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.ACCEPT,
      referenceId: member.id,
      metadata: { ...provenance, level, staffType: staffType ?? null },
    });

    return { level, previousLevel, staffType, awaitingIdentity };
  }

  /**
   * Gives the roles for `level` (+ type role). A member without the server tag or
   * an identifier in their name gets nothing yet: the roles are held until they
   * comply (see serverTagService.holdUntilIdentity).
   */
  private async grantOrHoldRoles(
    member: GuildMember,
    level: number,
    staffType: StaffType | null,
    reason: string,
  ): Promise<{ added: number; awaitingIdentity: AcceptResult["awaitingIdentity"] }> {
    const guildId = member.guild.id;

    if (staffIdentityRequirementService.isIdentityCompliant(member).compliant) {
      const synced = await syncStaffRoles(member, level, reason, { clearBlacklist: true });
      const typed = staffType ? await staffTypeService.assignType(member, staffType, reason) : null;
      return { added: synced.added.length + (typed?.added ? 1 : 0), awaitingIdentity: null };
    }

    const plan = await planStaffRoles(guildId, level, { clearBlacklist: true });
    const typeRoleId = staffType ? await staffTypeService.getConfiguredRole(guildId, staffType) : null;
    const held = [...plan.add, ...(typeRoleId ? [typeRoleId] : [])];

    await applyRoles(member, [], [...plan.remove, ...held], reason);
    const { serverTagService } = await import("../../server-tag/services/server-tag.service.ts");
    return { added: 0, awaitingIdentity: await serverTagService.holdUntilIdentity(member, held) };
  }

  /**
   * !back — puts a former or role-less staff member back at their level:
   * fired → reactivated at the level they held when fired; still ACTIVE but
   * missing roles (left and rejoined, roles stripped) → roles re-synced.
   * Blacklisted, transferred and on-break members are refused. acceptedBy is
   * kept — this is a reinstatement, not a new acceptance.
   */
  async reinstate(member: GuildMember, actor: StaffActor): Promise<ReinstateResult> {
    const guildId = member.guild.id;
    const staff = await staffService.get(member.id, guildId);
    if (!staff || staff.status === StaffStatus.TRANSFERRED) return { outcome: "no-record" };
    if (staff.status === StaffStatus.BLACKLISTED) return { outcome: "blacklisted" };
    if (staff.status === StaffStatus.BREAK) return { outcome: "on-break" };

    const wasFired = staff.status === StaffStatus.FIRED;
    const lastFire = wasFired
      ? await StaffHistoryModel.findOne({ staffId: staff._id, action: StaffHistoryAction.FIRE })
          .sort({ createdAt: -1 })
          .exec()
      : null;
    const ladder = await ladderFor(guildId);
    if (ladder.length === 0) throw new StaffAdminError(prefixMessages.staff.rolesNotConfigured);
    const level = Math.min(
      lastFire?.previousRoleLevel ?? staff.currentRoleLevel,
      maxLadderLevel(ladder),
    );

    if (actor.kind === "MEMBER") {
      // Same rule as promoting someone from nothing to that level.
      enforce(await staffManagementAuthorizationService.canPromote(actor.member, member, level, 0));
    }

    const reason = `Reinstated (!back) by ${actorId(actor)}`;
    const { added, awaitingIdentity } = await this.grantOrHoldRoles(
      member,
      level,
      staff.staffType ?? null,
      reason,
    );

    if (!wasFired && added === 0 && !awaitingIdentity) return { outcome: "nothing-to-do", level };

    // firedBy/firedAt stay as the record of the last firing; !stats only shows them while fired.
    await staffService.update(staff._id, { status: StaffStatus.ACTIVE, currentRoleLevel: level });
    await staffHistoryService.record({
      staffId: staff._id,
      action: StaffHistoryAction.REINSTATE,
      performedBy: actorId(actor),
      previousRoleLevel: wasFired ? 0 : staff.currentRoleLevel,
      newRoleLevel: level,
      metadata: { wasFired, awaitingIdentity: awaitingIdentity !== null },
    });

    return { outcome: "reinstated", level, wasFired, awaitingIdentity };
  }

  /**
   * `provenance.kind = "DEMISSION"` marks an approved resignation (staff support),
   * so the record can tell a resignation apart from a firing.
   */
  async fire(
    member: GuildMember,
    actor: StaffActor,
    blacklist: boolean,
    provenance: { kind?: "DEMISSION"; requestId?: string; reason?: string } = {},
  ): Promise<FireResult> {
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
    // Firing someone on break: their staff roles are already off, but the break role
    // has to go too (the open break itself is cancelled below).
    const vacationRole = await roleConfigService.getByType(guildId, RoleConfigType.VACATION);
    // Only the ones the bot can manage — one role above the bot would fail the whole removal.
    const ignoredRoleIds = heldIgnoredRoles(member, await roleConfigService.getIgnoredRoleIds(guildId));

    const remove = [
      ...ladder.map((r) => r.roleId),
      ...(general ? [general] : []),
      ...accessRoleIds,
      ...ignoredRoleIds,
      ...(vacationRole ? [vacationRole.roleId] : []),
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
      ...(provenance.kind ? { metadata: { ...provenance } } : {}),
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

  async promote(member: GuildMember, actor: StaffActor, move: LevelMove): Promise<LevelChangeResult> {
    return this.changeLevel(member, actor, "promote", move);
  }

  async demote(member: GuildMember, actor: StaffActor, move: LevelMove): Promise<LevelChangeResult> {
    return this.changeLevel(member, actor, "demote", move);
  }

  private async changeLevel(
    member: GuildMember,
    actor: StaffActor,
    direction: "promote" | "demote",
    move: LevelMove,
  ): Promise<LevelChangeResult> {
    const guildId = member.guild.id;
    const staff = await staffService.get(member.id, guildId);
    if (!staff || staff.status !== StaffStatus.ACTIVE) {
      throw new StaffAdminError(prefixMessages.staff.notStaffMember(`<@${member.id}>`));
    }
    const ladder = await ladderFor(guildId);
    if (ladder.length === 0) throw new StaffAdminError(prefixMessages.staff.rolesNotConfigured);

    const from = staff.currentRoleLevel;
    const { to, wrongWay } = resolveMove(direction, from, move, ladder);
    // e.g. "!promote @owner high" — never turn a promote into a demotion (or vice versa).
    if (wrongWay) return { from, to: from, changed: false, wrongWay: true };

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
