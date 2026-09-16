import type { Guild, GuildMember } from "discord.js";
import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { DomainError, isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import {
  getHierarchy,
  highestLevelFromRoleIds,
  validateHierarchy,
  type HierarchyIssue,
  type StaffHierarchy,
} from "../../configuration/utils/staff-levels.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffStatus } from "../types/enums.ts";
import { staffRoleAssignmentService } from "./staff-role-assignment.service.ts";

const log = logger.child("staff:scan");

export class StaffScanError extends DomainError {}

export interface ScanInput {
  guild: Guild;
  actorId: UserId;
}

export interface ScanReport {
  guildId: GuildId;

  found: number;
  created: number;
  updated: number;
  unchanged: number;

  invalid: number;
  errors: number;
  invalidMembers: UserId[];

  assignmentsFixed: number;
  staffRoleId: RoleId;
}

const inFlight = new Set<GuildId>();

interface Candidate {
  userId: UserId;
  level: number;
  member: GuildMember;
}

export class StaffScanService {
  async scan(input: ScanInput): Promise<ScanReport> {
    const guildId = input.guild.id;

    if (inFlight.has(guildId)) {
      throw new StaffScanError("SCAN_IN_PROGRESS", "SCAN_IN_PROGRESS");
    }
    inFlight.add(guildId);
    try {
      return await this.run(input);
    } finally {
      inFlight.delete(guildId);
    }
  }

  private async run(input: ScanInput): Promise<ScanReport> {
    const guildId = input.guild.id;

    const hierarchy = await getHierarchy(guildId);

    const issues = validateHierarchy(hierarchy);
    if (issues.length > 0) {
      throw new StaffScanError("SCAN_INVALID_HIERARCHY", "SCAN_INVALID_HIERARCHY", {
        issues,
      });
    }

    const staffRoleId = hierarchy.generalStaffRoleId;
    if (!staffRoleId) {
      throw new StaffScanError("SCAN_STAFF_ROLE_UNSET", "SCAN_STAFF_ROLE_UNSET");
    }

    const members = await this.fetchStaffMembers(input.guild, staffRoleId);

    const candidates: Candidate[] = [];
    const invalidMembers: UserId[] = [];
    for (const member of members) {
      const level = highestLevelFromRoleIds(hierarchy, member.roles.cache.keys());
      if (level === null) {
        invalidMembers.push(member.id);
        continue;
      }
      candidates.push({ userId: member.id, level, member });
    }

    if (invalidMembers.length > 0) {
      log.warn(
        `scan ${guildId}: ${invalidMembers.length} member(s) hold the Staff role with no numbered staff role`,
        { invalidMembers: invalidMembers.slice(0, 25) },
      );
    }

    const result = await this.synchronise(guildId, candidates);
    const assignmentsFixed = await this.reconcileAssignedRoles(guildId, candidates);

    log.info(
      `scan ${guildId} by ${input.actorId}: found ${members.length}, ` +
        `created ${result.created}, updated ${result.updated}, unchanged ${result.unchanged}, ` +
        `invalid ${invalidMembers.length}, errors ${result.errors}, ` +
        `assignments fixed ${assignmentsFixed}`,
    );

    return {
      guildId,
      found: members.length,
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
      invalid: invalidMembers.length,
      errors: result.errors,
      invalidMembers,
      assignmentsFixed,
      staffRoleId,
    };
  }

  private async reconcileAssignedRoles(
    guildId: GuildId,
    candidates: Candidate[],
  ): Promise<number> {
    if (candidates.length === 0) return 0;

    const assignments = await staffRoleAssignmentService.getAssignments(guildId);
    if (assignments.length === 0) return 0;

    let fixed = 0;
    for (const { member, level } of candidates) {
      const add: RoleId[] = [];
      const remove: RoleId[] = [];

      for (const assignment of assignments) {
        if (!member.guild.roles.cache.has(assignment.roleId)) continue;

        const applies = staffRoleAssignmentService.appliesToLevel(assignment, level);
        const held = member.roles.cache.has(assignment.roleId);
        if (applies && !held) add.push(assignment.roleId);
        else if (!applies && held) remove.push(assignment.roleId);
      }

      if (add.length === 0 && remove.length === 0) continue;

      try {
        if (add.length > 0) await member.roles.add(add, "Staff scan: assignment sync");
        if (remove.length > 0) await member.roles.remove(remove, "Staff scan: assignment sync");
        fixed += 1;
      } catch (err) {
        log.warn(`scan ${guildId}: assignment sync failed for ${member.id}`, err);
      }
    }

    return fixed;
  }

  private async fetchStaffMembers(guild: Guild, staffRoleId: RoleId): Promise<GuildMember[]> {
    const collection = await guild.members.fetch();
    const out: GuildMember[] = [];
    for (const member of collection.values()) {
      if (member.user?.bot) continue;

      if (!member.roles.cache.has(staffRoleId)) continue;
      out.push(member);
    }
    return out;
  }

  private async synchronise(
    guildId: GuildId,
    candidates: Candidate[],
  ): Promise<{ created: number; updated: number; unchanged: number; errors: number }> {
    if (candidates.length === 0) return { created: 0, updated: 0, unchanged: 0, errors: 0 };

    const userIds = candidates.map((c) => c.userId);
    const existing = await StaffModel.find({ guildId, userId: { $in: userIds } })
      .select({ userId: 1, currentRoleLevel: 1 })
      .exec();
    const currentLevels = new Map<UserId, number>();
    for (const row of existing) currentLevels.set(row.userId, row.currentRoleLevel);

    const operations = [];
    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const candidate of candidates) {
      const known = currentLevels.get(candidate.userId);

      if (known !== undefined && known === candidate.level) {
        unchanged += 1;
        continue;
      }
      if (known !== undefined) updated += 1;
      else created += 1;

      operations.push({
        updateOne: {
          filter: { guildId, userId: candidate.userId },
          update: {
            $set: { currentRoleLevel: candidate.level },

            $setOnInsert: {
              status: StaffStatus.ACTIVE,
              points: 0,
              reportsClaimed: 0,
              reportsCompleted: 0,
              ticketsClaimed: 0,
              ticketsCompleted: 0,
              giftClaimsHandled: 0,
              warningsIssued: 0,
              staffWarningsIssued: 0,
            },
          },
          upsert: true,
        },
      });
    }

    if (operations.length === 0) return { created, updated, unchanged, errors: 0 };

    let errors = 0;
    try {
      await StaffModel.bulkWrite(operations as never, { ordered: false });
    } catch (err) {
      const writeErrors = (err as { writeErrors?: unknown[] }).writeErrors ?? [];
      const duplicates = writeErrors.filter((e) => isDuplicateKeyError(e)).length;
      errors = Math.max(0, writeErrors.length - duplicates);
      if (errors > 0) log.error(`scan ${guildId}: ${errors} write error(s)`, err);
      else if (!isDuplicateKeyError(err) && writeErrors.length === 0) {
        errors = operations.length;
        log.error(`scan ${guildId}: bulk write failed`, err);
      }
      created = Math.max(0, created - duplicates);
    }

    return { created, updated, unchanged, errors };
  }
}

export type { HierarchyIssue, StaffHierarchy };
export const staffScanService = new StaffScanService();
