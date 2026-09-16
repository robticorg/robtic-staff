import type { Guild, GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import type { GuildId, IdLike, RoleId, UserId } from "../../../shared/types/index.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import {
  getHierarchy,
  highestLevelFromRoleIds,
  validateHierarchy,
} from "../../configuration/utils/staff-levels.ts";
import type { Staff } from "../models/staff.model.ts";
import { StaffActivityType, StaffHistoryAction, StaffStatus } from "../types/enums.ts";
import type { StaffType } from "../types/enums.ts";
import { staffService } from "./staff.service.ts";
import { staffActivityService } from "./staff-activity.service.ts";
import { staffHistoryService } from "./staff-history.service.ts";
import { staffActiveCasesService, type ActiveCaseCounts } from "./staff-active-cases.service.ts";
import { staffManagementAuthorizationService } from "./staff-management-authorization.service.ts";
import { staffAcceptedRoleService } from "./staff-accepted-role.service.ts";
import { staffRoleAssignmentService } from "./staff-role-assignment.service.ts";
import { planStaffRoles } from "./staff-role-sync.service.ts";
import { staffTypeService } from "./staff-type.service.ts";
import {
  TransferProblem,
  collectTransferableRoles,
  filterAssignableRoles,
  validateTransfer,
} from "./staff-transfer-rules.ts";

const log = logger.child("staff:transfer");
const M = staffMessages.transfer;

export class StaffTransferError extends DomainError {
  constructor(
    public readonly problem: TransferProblem | "ROLE_WRITE_FAILED",
    message: string,
    context?: Record<string, unknown>,
  ) {
    super("STAFF_TRANSFER", message, { problem, ...context });
  }
}

export interface TransferInput {
  actor: GuildMember;
  source: GuildMember;
  target: GuildMember;
}

export interface TransferResult {
  sourceLevel: number;
  staffType: StaffType | null;
  /** Roles actually written to the target. */
  transferredRoleIds: RoleId[];
  /** Roles actually taken off the source. */
  removedRoleIds: RoleId[];
  /** Named but skipped by the safety gate (missing, managed, above the bot). */
  skippedRoleIds: RoleId[];
  sourceStaffId: string;
  targetStaffId: string;
}

interface TransferPlan {
  level: number;
  staffType: StaffType | null;
  /** What the target must gain. */
  grant: RoleId[];
  skipped: RoleId[];
  /** Every Staff-managed role id, for the source cleanup. */
  managedRoleIds: RoleId[];
}

/**
 * Hands one member's Staff position to another.
 *
 * Deliberately *not* a role copier: only the five Staff-managed categories move
 * (marker, numbered ladder, Access Roles, level assignments, Staff Type), and
 * the level they are derived from comes from the hierarchy, never from whatever
 * roles happen to look staff-ish. Management, warning, vacation and blacklist
 * roles are never touched on either side, and unrelated Discord roles are never
 * even named.
 *
 * Validation is complete before the first write (§Atomicity); a failed Discord
 * write rolls the role changes back and leaves the database untouched.
 */
export class StaffTransferService {
  async transfer(input: TransferInput): Promise<TransferResult> {
    const { actor, source, target } = input;
    const guild = actor.guild;
    const guildId = guild.id;

    // ── 1. Actor authorization ────────────────────────────────────────────
    const decision = await staffManagementAuthorizationService.canTransfer(actor, source, target);
    if (!decision.allowed) {
      log.warn(
        `transfer denied for ${actor.id} in ${guildId} (${source.id} → ${target.id}): ${decision.reason}`,
      );
      throw new StaffTransferError(TransferProblem.NOT_AUTHORIZED, decision.message);
    }

    // ── 2-8. State validation, all of it, before anything is touched ──────
    const [sourceStaff, targetStaff, hierarchy, blacklistRow] = await Promise.all([
      staffService.get(source.id, guildId),
      staffService.get(target.id, guildId),
      getHierarchy(guildId),
      roleConfigService.getByType(guildId, RoleConfigType.BLACKLIST),
    ]);

    const [openVacation, activeCases] = await Promise.all([
      this.hasOpenVacation(guildId, source.id),
      // Skipped only when there is no source record at all — validate() rejects
      // that first anyway, and the lookup would be meaningless.
      sourceStaff
        ? staffActiveCasesService.countForMember(guildId, source.id)
        : Promise.resolve(emptyCounts()),
    ]);

    // §Staff Level — the hierarchy is the source of truth. The stored level is
    // only a fallback for a member whose ladder roles drifted, and a mismatch is
    // worth knowing about.
    const levelFromRoles = highestLevelFromRoleIds(hierarchy, source.roles.cache.keys());
    if (
      sourceStaff &&
      levelFromRoles !== null &&
      levelFromRoles !== sourceStaff.currentRoleLevel
    ) {
      log.warn(
        `source ${source.id} level mismatch in ${guildId}: roles say ${levelFromRoles}, ` +
          `record says ${sourceStaff.currentRoleLevel} — using the roles`,
      );
    }
    const level = levelFromRoles ?? sourceStaff?.currentRoleLevel ?? null;

    const problem = validateTransfer({
      sourceId: source.id,
      targetId: target.id,
      targetIsBot: target.user.bot,
      sourceStatus: sourceStaff?.status ?? null,
      sourceHoldsBlacklistRole: !!blacklistRow && source.roles.cache.has(blacklistRow.roleId),
      sourceHasOpenVacation: openVacation,
      sourceActiveCases: activeCases.total,
      targetStatus: targetStaff?.status ?? null,
      targetHoldsBlacklistRole: !!blacklistRow && target.roles.cache.has(blacklistRow.roleId),
      hierarchyValid: validateHierarchy(hierarchy).length === 0,
      ladderConfigured: hierarchy.levels.length > 0,
      sourceLevel: level,
    });
    if (problem) throw this.problemError(problem, source, target, activeCases);

    // Narrowed by validateTransfer, which rejects a null source record / level.
    const staff = sourceStaff as HydratedDocument<Staff>;
    const sourceLevel = level as number;

    // ── 9-10. Plan ────────────────────────────────────────────────────────
    const plan = await this.buildPlan(guild, source, sourceLevel);

    // ── 11-12. Apply. Everything from here rolls back as one unit ─────────
    const added = await this.grantToTarget(target, plan, actor.id);
    let removed: RoleId[] = [];
    let targetStaffDoc: HydratedDocument<Staff>;

    try {
      removed = await this.stripSource(source, plan, actor.id);

      // Applied through its own service so the "one type at a time" replacement
      // rule stays in one place.
      if (plan.staffType) {
        await staffTypeService.assignType(
          target,
          plan.staffType,
          `Staff transfer from ${source.id} by ${actor.id}`,
        );
      }

      targetStaffDoc = targetStaff ?? (await staffService.ensure(target.id, guildId));
      const now = new Date();

      await staffService.update(targetStaffDoc._id, {
        status: StaffStatus.ACTIVE,
        currentRoleLevel: sourceLevel,
        staffType: plan.staffType ?? null,
        transferredFrom: staff._id,
        transferredAt: now,
        transferredBy: actor.id,
      });

      // Points, counters and every StaffPointTransaction / StaffActivity row
      // stay exactly where they are: on the source record. The target starts as
      // a new Staff identity.
      await staffService.update(staff._id, {
        status: StaffStatus.TRANSFERRED,
        currentRoleLevel: 0,
        staffType: null,
        transferredTo: targetStaffDoc._id,
        transferredAt: now,
        transferredBy: actor.id,
      });
    } catch (err) {
      // Discord *or* MongoDB failed — put both members back the way they were
      // so the two never disagree, and report failure.
      await this.rollbackRoles(source, target, added, removed, actor.id);
      log.error(`transfer ${source.id} → ${target.id} in ${guildId} failed — rolled back`, err);
      throw new StaffTransferError("ROLE_WRITE_FAILED", M.roleWriteFailed);
    }

    // Last, and only once the transfer really happened: there is no such thing
    // as a successful-transfer record for a transfer that did not complete.
    await this.recordHistory({
      staff,
      targetStaffDocId: targetStaffDoc._id,
      source,
      target,
      actorId: actor.id,
      sourceLevel,
      transferredRoleIds: added,
    }).catch((err) =>
      // The position has already moved; failing the command now would be a lie.
      log.error(`transfer ${source.id} → ${target.id} succeeded but history failed`, err),
    );

    log.info(
      `staff transfer ${source.id} → ${target.id} in ${guildId} by ${actor.id}: ` +
        `level ${sourceLevel}, type ${plan.staffType ?? "none"}, ` +
        `${added.length} role(s) granted, ${removed.length} removed, ` +
        `${plan.skipped.length} skipped`,
    );

    return {
      sourceLevel,
      staffType: plan.staffType,
      transferredRoleIds: added,
      removedRoleIds: removed,
      skippedRoleIds: plan.skipped,
      sourceStaffId: String(staff._id),
      targetStaffId: String(targetStaffDoc._id),
    };
  }

  /**
   * What the target must end up holding. Level-driven roles come from the same
   * planner accept/promote use; Access Roles are intersected with what the
   * source actually holds, never handed out wholesale.
   */
  private async buildPlan(
    guild: Guild,
    source: GuildMember,
    level: number,
  ): Promise<TransferPlan> {
    const guildId = guild.id;
    const hierarchy = await getHierarchy(guildId);

    const levelPlan = await planStaffRoles(guildId, level);
    const heldAccess = [...hierarchy.accessRoleIds].filter((id) => source.roles.cache.has(id));

    // The role is the truth for what to hand over; the record is the fallback
    // when the role was removed by hand.
    const staffType =
      (await staffTypeService.getTypeFromRoles(source)) ??
      (await staffTypeService.getType(guildId, source.id));
    const typeRole = staffType
      ? await staffTypeService.getConfiguredRole(guildId, staffType)
      : null;

    const wanted = collectTransferableRoles({
      levelDriven: levelPlan.add,
      heldAccess,
      typeRole,
    });

    const { safe, rejected } = filterAssignableRoles(wanted, this.safetyInput(guild));
    if (rejected.length > 0) {
      log.warn(`transfer in ${guildId} skipped ${rejected.length} unsafe role(s)`, { rejected });
    }

    // Everything this system owns, for the source-side cleanup. Deliberately
    // wider than `wanted`: rungs above the level and out-of-range assignments
    // are Staff-managed too, and must not be left behind on the source.
    const [assignmentRoleIds, typeRoleIds, acceptedConfig] = await Promise.all([
      staffRoleAssignmentService.getManagedRoleIds(guildId),
      staffTypeService.getManagedRoleIds(guildId),
      staffAcceptedRoleService.getConfig(guildId),
    ]);

    const managedRoleIds = [
      ...hierarchy.levels.map((rung) => rung.roleId),
      ...(hierarchy.generalStaffRoleId ? [hierarchy.generalStaffRoleId] : []),
      ...hierarchy.accessRoleIds,
      ...assignmentRoleIds,
      ...typeRoleIds,
      ...(acceptedConfig ? [acceptedConfig.roleId] : []),
    ];

    return { level, staffType, grant: safe, skipped: rejected, managedRoleIds };
  }

  private safetyInput(guild: Guild) {
    const me = guild.members.me;
    const existing = new Set<RoleId>();
    const managed = new Set<RoleId>();
    const manageable = new Set<RoleId>();

    for (const role of guild.roles.cache.values()) {
      existing.add(role.id);
      if (role.managed) managed.add(role.id);
      if (me && me.roles.highest.comparePositionTo(role) > 0) manageable.add(role.id);
    }
    return { existing, managed, manageable, everyoneRoleId: guild.id };
  }

  private async grantToTarget(
    target: GuildMember,
    plan: TransferPlan,
    actorId: UserId,
  ): Promise<RoleId[]> {
    const toAdd = plan.grant.filter((id) => !target.roles.cache.has(id));
    if (toAdd.length === 0) return [];
    try {
      await target.roles.add(toAdd, `Staff transfer by ${actorId}`);
      return toAdd;
    } catch (err) {
      log.error(`transfer could not grant roles to ${target.id}`, err);
      throw new StaffTransferError("ROLE_WRITE_FAILED", M.roleWriteFailed);
    }
  }

  /**
   * §Source Cleanup — Staff-managed roles only. Anything outside
   * `managedRoleIds` is never named, so unrelated roles cannot be removed.
   */
  private async stripSource(
    source: GuildMember,
    plan: TransferPlan,
    actorId: UserId,
  ): Promise<RoleId[]> {
    const toRemove = [...new Set(plan.managedRoleIds)].filter((id) =>
      source.roles.cache.has(id),
    );
    if (toRemove.length === 0) return [];
    await source.roles.remove(toRemove, `Staff transfer to a new member by ${actorId}`);
    return toRemove;
  }

  /**
   * Best-effort undo of both halves. Failures here are logged loudly rather
   * than thrown: the caller is already reporting the transfer as failed, and a
   * rollback error is an operator problem, not a second exception to swallow
   * the first one.
   */
  private async rollbackRoles(
    source: GuildMember,
    target: GuildMember,
    granted: readonly RoleId[],
    stripped: readonly RoleId[],
    actorId: UserId,
  ): Promise<void> {
    const reason = `Staff transfer rolled back by ${actorId}`;

    if (granted.length > 0) {
      await target.roles
        .remove([...granted], reason)
        .catch((err) =>
          log.error(
            `ROLLBACK FAILED for target ${target.id} — may still hold ${granted.length} role(s)`,
            err,
          ),
        );
    }
    if (stripped.length > 0) {
      await source.roles
        .add([...stripped], reason)
        .catch((err) =>
          log.error(
            `ROLLBACK FAILED for source ${source.id} — may be missing ${stripped.length} role(s)`,
            err,
          ),
        );
    }
  }

  private async recordHistory(input: {
    staff: HydratedDocument<Staff>;
    targetStaffDocId: IdLike;
    source: GuildMember;
    target: GuildMember;
    actorId: UserId;
    sourceLevel: number;
    transferredRoleIds: RoleId[];
  }): Promise<void> {
    const metadata = {
      sourceStaffId: String(input.staff._id),
      targetStaffId: String(input.targetStaffDocId),
      sourceUserId: input.source.id,
      targetUserId: input.target.id,
      sourceLevel: input.sourceLevel,
      transferredRoleIds: input.transferredRoleIds,
      performedBy: input.actorId,
    };

    // One entry per record so both timelines read correctly. Neither is a fake
    // ACCEPT/PROMOTE/DEMOTE — TRANSFER is its own lifecycle action.
    await staffHistoryService.record({
      staffId: input.staff._id,
      action: StaffHistoryAction.TRANSFER,
      performedBy: input.actorId,
      previousRoleLevel: input.sourceLevel,
      newRoleLevel: 0,
      metadata: { ...metadata, side: "SOURCE" },
    });
    await staffHistoryService.record({
      staffId: input.targetStaffDocId,
      action: StaffHistoryAction.TRANSFER,
      performedBy: input.actorId,
      previousRoleLevel: 0,
      newRoleLevel: input.sourceLevel,
      metadata: { ...metadata, side: "TARGET" },
    });

    await staffActivityService.create({
      staffId: input.staff._id,
      type: StaffActivityType.TRANSFER,
      referenceId: input.target.id,
      metadata: { ...metadata, side: "SOURCE" },
    });
    await staffActivityService.create({
      staffId: input.targetStaffDocId,
      type: StaffActivityType.TRANSFER,
      referenceId: input.source.id,
      metadata: { ...metadata, side: "TARGET" },
    });
  }

  /** Lazy import — the vacation module already depends on staff management. */
  private async hasOpenVacation(guildId: GuildId, userId: UserId): Promise<boolean> {
    try {
      const { VacationModel } = await import("../../vacation/models/vacation.model.ts");
      const open = await VacationModel.exists({ guildId, staffId: userId, isOpen: true }).exec();
      return !!open;
    } catch (err) {
      // Same rule as the active-case counts: an unknown answer blocks.
      log.error(`open vacation lookup failed for ${userId} in ${guildId} — treating as open`, err);
      return true;
    }
  }

  private problemError(
    problem: TransferProblem,
    source: GuildMember,
    target: GuildMember,
    cases: ActiveCaseCounts,
  ): StaffTransferError {
    const sourceMention = `<@${source.id}>`;
    const targetMention = `<@${target.id}>`;

    const message =
      problem === TransferProblem.SOURCE_HAS_ACTIVE_CASES
        ? M.activeCases(sourceMention, cases)
        : M.problem[problem](sourceMention, targetMention);

    return new StaffTransferError(problem, message, {
      sourceId: source.id,
      targetId: target.id,
    });
  }
}

function emptyCounts(): ActiveCaseCounts {
  return { reports: 0, tickets: 0, appeals: 0, giftClaims: 0, total: 0 };
}

export const staffTransferService = new StaffTransferService();
