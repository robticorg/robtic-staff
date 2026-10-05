import type { GuildMember } from "discord.js";
import { DomainError } from "../../../../shared/utils/errors.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { hiddenStaffMessages } from "../../../../data/hidden-staff/messages.ts";
import { staffHistoryService } from "../../services/staff-history.service.ts";
import { syncStaffRoles } from "../../services/staff-role-sync.service.ts";
import { staffService } from "../../services/staff.service.ts";
import { StaffHistoryAction, StaffStatus } from "../../types/enums.ts";
import { hiddenStaffRepository } from "../repositories/hidden-staff.repository.ts";
import { hiddenStaffAuthorizationService } from "./hidden-staff-authorization.service.ts";
import {
  hiddenRoleForLevel,
  hiddenRolePlan,
  highestHiddenLevel,
  type HiddenHierarchy,
  type HiddenLevel,
} from "./hidden-staff-hierarchy.ts";
import { hiddenStaffHierarchyService } from "./hidden-staff-hierarchy.service.ts";

const log = logger.child("hidden-staff");
const C = hiddenStaffMessages.command;
const CFG = hiddenStaffMessages.config;
const MV = hiddenStaffMessages.moves;

export class HiddenStaffError extends DomainError {
  constructor(message: string) {
    super("HIDDEN_STAFF", message);
  }
}

export type HiddenMoveResult =
  | { kind: "MOVED"; from: HiddenLevel; to: HiddenLevel }
  | { kind: "AT_LIMIT" };

export function nextHiddenLevel(current: number, max: number, direction: "promote" | "demote"): number | null {
  if (current < 1) return null;
  const next = direction === "promote" ? current + 1 : current - 1;
  return next < 1 || next > max ? null : next;
}

function historyAction(from: number, to: number): StaffHistoryAction | null {
  if (from === to) return null;
  if (from === 0) return StaffHistoryAction.HIDDEN_ACCEPT;
  if (to === 0) return StaffHistoryAction.HIDDEN_REMOVE;
  return to > from ? StaffHistoryAction.HIDDEN_PROMOTE : StaffHistoryAction.HIDDEN_DEMOTE;
}

export class HiddenStaffService {
  private requireManager(actor: GuildMember): void {
    if (!hiddenStaffAuthorizationService.isHiddenManager(actor)) throw new HiddenStaffError(C.notManager);
  }

  private async requireHierarchy(member: GuildMember): Promise<HiddenHierarchy> {
    const hierarchy = await hiddenStaffHierarchyService.getHiddenHierarchy(member.guild);
    if (hierarchy.problem) throw new HiddenStaffError(CFG.problems[hierarchy.problem] ?? CFG.problems.NOT_CONFIGURED!);
    return hierarchy;
  }

  private async requireStaff(member: GuildMember) {
    const staff = await staffService.get(member.id, member.guild.id);
    if (!staff || (staff.status !== StaffStatus.ACTIVE && staff.status !== StaffStatus.BREAK)) {
      throw new HiddenStaffError(C.notStaff(member.id));
    }
    return staff;
  }

  private async applyRoles(member: GuildMember, hierarchy: HiddenHierarchy, level: number, reason: string): Promise<void> {
    const plan = hiddenRolePlan(hierarchy, level);
    const roles = member.guild.roles.cache;
    const toAdd = plan.add.filter((id) => roles.has(id) && !member.roles.cache.has(id));
    const toRemove = plan.remove.filter((id) => roles.has(id) && member.roles.cache.has(id));
    if (toAdd.length) await member.roles.add(toAdd, reason);
    if (toRemove.length) await member.roles.remove(toRemove, reason);
  }

  private async record(member: GuildMember, actorId: string, from: number, to: number): Promise<void> {
    const action = historyAction(from, to);
    if (!action) return;
    const staff = await staffService.get(member.id, member.guild.id);
    if (!staff) return;
    await staffHistoryService
      .record({ staffId: staff._id, action, performedBy: actorId, metadata: { hiddenFrom: from, hiddenTo: to } })
      .catch((err) => log.warn(`hidden history for ${member.id} failed`, err));
  }

  private async commit(member: GuildMember, actorId: string, hierarchy: HiddenHierarchy, from: number, to: number): Promise<void> {
    await this.applyRoles(member, hierarchy, to, `Hidden staff ${from} → ${to} by ${actorId}`);
    if (to > 0) {
      await hiddenStaffRepository.activate({
        guildId: member.guild.id,
        userId: member.id,
        level: to,
        ...(from === 0 ? { acceptedBy: actorId } : {}),
      });
    } else {
      await hiddenStaffRepository.deactivate(member.guild.id, member.id, actorId);
    }
    await this.record(member, actorId, from, to);
  }

  async levelOptions(actor: GuildMember, target: GuildMember): Promise<HiddenLevel[]> {
    this.requireManager(actor);
    await this.requireStaff(target);
    return (await this.requireHierarchy(target)).levels;
  }

  async setLevel(actor: GuildMember, target: GuildMember, level: number): Promise<HiddenLevel> {
    this.requireManager(actor);
    const staff = await this.requireStaff(target);
    const hierarchy = await this.requireHierarchy(target);
    const chosen = hiddenRoleForLevel(hierarchy, level);
    if (!chosen) throw new HiddenStaffError(C.levelGone);

    if (staff.status === StaffStatus.ACTIVE) {
      await syncStaffRoles(target, staff.currentRoleLevel, `Hidden staff by ${actor.id}`);
    }
    const from = highestHiddenLevel(hierarchy, target.roles.cache.keys());
    await this.commit(target, actor.id, hierarchy, from, level);
    return chosen;
  }

  async grantFirstLevel(target: GuildMember, actorId: string): Promise<HiddenLevel> {
    const hierarchy = await this.requireHierarchy(target);
    const first = hiddenRoleForLevel(hierarchy, 1)!;
    const from = highestHiddenLevel(hierarchy, target.roles.cache.keys());
    await this.commit(target, actorId, hierarchy, from, 1);
    return first;
  }

  async assertCanAccept(actor: GuildMember, target: GuildMember): Promise<void> {
    if (!hiddenStaffAuthorizationService.canAcceptHiddenStaff(actor)) throw new HiddenStaffError(C.notManager);
    await this.requireHierarchy(target);
  }

  async move(actor: GuildMember, target: GuildMember, direction: "promote" | "demote"): Promise<HiddenMoveResult> {
    const allowed =
      direction === "promote"
        ? hiddenStaffAuthorizationService.canPromoteHiddenStaff(actor)
        : hiddenStaffAuthorizationService.canDemoteHiddenStaff(actor);
    if (!allowed) throw new HiddenStaffError(C.notManager);
    const hierarchy = await this.requireHierarchy(target);
    const current = highestHiddenLevel(hierarchy, target.roles.cache.keys());
    if (current === 0) throw new HiddenStaffError(C.notHidden(target.id));

    const next = nextHiddenLevel(current, hierarchy.levels.length, direction);
    if (next === null) return { kind: "AT_LIMIT" };
    await this.commit(target, actor.id, hierarchy, current, next);
    return { kind: "MOVED", from: hiddenRoleForLevel(hierarchy, current)!, to: hiddenRoleForLevel(hierarchy, next)! };
  }

  async remove(actor: GuildMember, target: GuildMember): Promise<void> {
    this.requireManager(actor);
    const hierarchy = await this.requireHierarchy(target);
    const current = highestHiddenLevel(hierarchy, target.roles.cache.keys());
    const stored = await hiddenStaffRepository.isActive(target.guild.id, target.id);
    if (current === 0 && !stored) throw new HiddenStaffError(C.notHidden(target.id));
    await this.commit(target, actor.id, hierarchy, Math.max(current, stored ? 1 : 0), 0);
  }

  limitMessage(target: GuildMember, direction: "promote" | "demote"): string {
    return direction === "promote" ? MV.alreadyTop(target.id) : MV.alreadyBottom(target.id);
  }
}

export const hiddenStaffService = new HiddenStaffService();
