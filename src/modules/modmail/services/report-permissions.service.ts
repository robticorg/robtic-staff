import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import type { ModmailCase } from "../models/modmail-case.model.ts";
import { ModmailCaseStatus } from "../types/enums.ts";

export interface Decision {
  ok: boolean;
  reason?: string;
}

export interface ClaimEligibilityInput {
  memberIsStaff: boolean;

  memberIsAdministrator?: boolean;
  memberIsReportedUser: boolean;
  caseStatus: ModmailCaseStatus;
  alreadyClaimed: boolean;
}

export function decideClaimEligibility(input: ClaimEligibilityInput): Decision {
  if (input.memberIsReportedUser) {
    return { ok: false, reason: modmailMessages.permissions.claimAboutYou };
  }
  if (!input.memberIsStaff && !input.memberIsAdministrator) {
    return { ok: false, reason: modmailMessages.permissions.claimNotManager };
  }
  if (input.alreadyClaimed || input.caseStatus !== ModmailCaseStatus.PENDING) {
    return { ok: false, reason: modmailMessages.claim.alreadyClaimed };
  }
  return { ok: true };
}

export interface ManageAccessInput {
  memberIsStaff: boolean;
  memberIsAdministrator?: boolean;
  memberIsReportedUser: boolean;
  memberIsClaimer: boolean;
  memberIsStaffManager: boolean;
}

export function decideManageAccess(input: ManageAccessInput): boolean {
  if (input.memberIsReportedUser) return false;
  if (input.memberIsAdministrator) return true;
  if (!input.memberIsStaff) return false;
  return input.memberIsClaimer || input.memberIsStaffManager;
}

export interface ReportTransferInput {
  caseIsOpen: boolean;
  caseIsClaimed: boolean;
  actorIsHandler: boolean;
  actorIsAdministrator: boolean;
  targetIsBot: boolean;
  targetIsCurrentHandler: boolean;
  targetIsReportedUser: boolean;
  targetIsStaffOrAdministrator: boolean;
}

export function decideTransferEligibility(input: ReportTransferInput): Decision {
  if (!input.caseIsOpen) return { ok: false, reason: "CLOSED" };
  if (!input.caseIsClaimed) return { ok: false, reason: "NOT_CLAIMED" };
  if (!input.actorIsHandler && !input.actorIsAdministrator) {
    return { ok: false, reason: "NOT_ALLOWED" };
  }
  if (input.targetIsBot) return { ok: false, reason: "TARGET_IS_BOT" };
  if (input.targetIsCurrentHandler) return { ok: false, reason: "TARGET_IS_HANDLER" };
  if (input.targetIsReportedUser) return { ok: false, reason: "TARGET_IS_REPORTED" };
  if (!input.targetIsStaffOrAdministrator) return { ok: false, reason: "TARGET_NOT_STAFF" };
  return { ok: true };
}

export function decideReporterInfoAccess(input: { isAdministrator: boolean }): boolean {
  return input.isAdministrator;
}

async function staffRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
  const [ladder, generalRoleId] = await Promise.all([
    roleConfigService.getStaffRoleLevels(guildId),
    roleConfigService.getGeneralStaffRoleId(guildId),
  ]);
  const ids = new Set<RoleId>(ladder.map((r) => r.roleId));
  if (generalRoleId) ids.add(generalRoleId);
  return ids;
}

export class ReportPermissionService {
  async isStaffMember(member: GuildMember): Promise<boolean> {
    const ids = await staffRoleIds(member.guild.id);
    return member.roles.cache.some((role) => ids.has(role.id));
  }

  async isStaffManager(member: GuildMember): Promise<boolean> {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    const managerRole = await roleConfigService.getByType(
      member.guild.id,
      RoleConfigType.STAFF_MANAGER,
    );
    return managerRole ? member.roles.cache.has(managerRole.roleId) : false;
  }

  isAdministrator(member: GuildMember): boolean {
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }

  canViewReporterInfo(member: GuildMember): boolean {
    return decideReporterInfoAccess({ isAdministrator: this.isAdministrator(member) });
  }

  async canClaimReport(member: GuildMember, kase: Pick<ModmailCase, "status" | "claimedBy" | "reportedUserId">): Promise<Decision> {
    return decideClaimEligibility({
      memberIsStaff: await this.isStaffMember(member),
      memberIsAdministrator: this.isAdministrator(member),
      memberIsReportedUser: member.id === kase.reportedUserId,
      caseStatus: kase.status,
      alreadyClaimed: kase.claimedBy != null,
    });
  }

  async canReceiveReport(member: GuildMember): Promise<boolean> {
    if (this.isAdministrator(member)) return true;
    return this.isStaffMember(member);
  }

  async canTransferReport(
    actor: GuildMember,
    target: GuildMember,
    kase: Pick<ModmailCase, "status" | "claimedByDiscordId" | "reportedUserId">,
  ): Promise<Decision> {
    return decideTransferEligibility({
      caseIsOpen: kase.status !== ModmailCaseStatus.CLOSED,
      caseIsClaimed: !!kase.claimedByDiscordId,
      actorIsHandler: kase.claimedByDiscordId === actor.id,
      actorIsAdministrator: this.isAdministrator(actor),
      targetIsBot: target.user.bot,
      targetIsCurrentHandler: kase.claimedByDiscordId === target.id,
      targetIsReportedUser: target.id === kase.reportedUserId,
      targetIsStaffOrAdministrator: await this.canReceiveReport(target),
    });
  }

  async canManageReport(
    member: GuildMember,
    kase: Pick<ModmailCase, "claimedByDiscordId" | "reportedUserId">,
  ): Promise<boolean> {
    const [isStaff, isManager] = await Promise.all([
      this.isStaffMember(member),
      this.isStaffManager(member),
    ]);
    return decideManageAccess({
      memberIsStaff: isStaff,
      memberIsAdministrator: this.isAdministrator(member),
      memberIsReportedUser: member.id === kase.reportedUserId,
      memberIsClaimer: !!kase.claimedByDiscordId && member.id === kase.claimedByDiscordId,
      memberIsStaffManager: isManager,
    });
  }
}

export const reportPermissionService = new ReportPermissionService();
