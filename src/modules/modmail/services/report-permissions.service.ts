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
  memberIsReportedUser: boolean;
  caseStatus: ModmailCaseStatus;
  alreadyClaimed: boolean;
}

export function decideClaimEligibility(input: ClaimEligibilityInput): Decision {
  if (input.memberIsReportedUser) {
    return { ok: false, reason: modmailMessages.permissions.claimAboutYou };
  }
  if (!input.memberIsStaff) {
    return { ok: false, reason: modmailMessages.permissions.claimNotManager };
  }
  if (input.alreadyClaimed || input.caseStatus !== ModmailCaseStatus.PENDING) {
    return { ok: false, reason: modmailMessages.claim.alreadyClaimed };
  }
  return { ok: true };
}

export interface ManageAccessInput {
  memberIsStaff: boolean;
  memberIsReportedUser: boolean;
  memberIsClaimer: boolean;
  memberIsStaffManager: boolean;
}

export function decideManageAccess(input: ManageAccessInput): boolean {
  if (input.memberIsReportedUser) return false;
  if (!input.memberIsStaff) return false;
  return input.memberIsClaimer || input.memberIsStaffManager;
}

export function decideReporterInfoAccess(input: { isAdministrator: boolean }): boolean {
  return input.isAdministrator;
}

async function staffRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
  const [ladder, general] = await Promise.all([
    roleConfigService.getStaffRoleLevels(guildId),
    roleConfigService.getByType(guildId, RoleConfigType.STAFF),
  ]);
  const ids = new Set<RoleId>(ladder.map((r) => r.roleId));
  if (general) ids.add(general.roleId);
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
      memberIsReportedUser: member.id === kase.reportedUserId,
      caseStatus: kase.status,
      alreadyClaimed: kase.claimedBy != null,
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
      memberIsReportedUser: member.id === kase.reportedUserId,
      memberIsClaimer: !!kase.claimedByDiscordId && member.id === kase.claimedByDiscordId,
      memberIsStaffManager: isManager,
    });
  }
}

export const reportPermissionService = new ReportPermissionService();
