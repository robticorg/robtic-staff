import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { TicketClaimerConfig, TicketPanelConfig } from "../../../data/tickets/index.ts";
import { isUnsetId, panelIsAdminOnly, ticketMain } from "../../../data/tickets/index.ts";
import { staffPermissionService } from "../../staff/index.ts";
import type { Ticket } from "../models/ticket.model.ts";
import { TicketStatus } from "../types/enums.ts";

export interface Decision {
  ok: boolean;
  reason?: string;
}

export interface ClaimContextInput {
  memberHasSupportRole: boolean;
  memberIsManager: boolean;
  memberIsAdministrator: boolean;
  /** The ticket's own opener — never allowed to claim it, no exceptions. */
  memberIsOwner: boolean;
  claimer: TicketClaimerConfig;
  ticketStatus: TicketStatus;
  alreadyClaimed: boolean;
  /** Panel has no support role configured — Administrators only. */
  panelIsAdminOnly?: boolean;
}

export function decideClaimEligibility(input: ClaimContextInput): Decision {
  // Checked first and unconditionally — a staff member who opened this
  // ticket must not be able to claim (and credit) their own request, even as
  // an administrator or the ticket's manager/support role holder.
  if (input.memberIsOwner) return { ok: false, reason: "IS_OWNER" };

  // With no support role configured the panel is administrator-only: managers
  // and the (non-existent) support role grant nothing.
  const eligibleRole = input.panelIsAdminOnly
    ? input.memberIsAdministrator
    : input.memberIsAdministrator ||
      (input.memberHasSupportRole && input.claimer.supportRoleCanClaim) ||
      (input.memberIsManager && input.claimer.managersCanClaim);

  if (!eligibleRole) return { ok: false, reason: "NOT_ELIGIBLE" };
  if (input.ticketStatus !== TicketStatus.OPEN) return { ok: false, reason: "NOT_OPEN" };
  if (input.alreadyClaimed) return { ok: false, reason: "ALREADY_CLAIMED" };
  return { ok: true };
}

export interface TransferContextInput {
  /** Panel flag — a panel with `transferable: false` never allows a handover. */
  transferable: boolean;
  ticketStatus: TicketStatus;
  ticketIsClaimed: boolean;
  /** Only the current claimer (or an administrator) hands a ticket over. */
  actorIsClaimer: boolean;
  actorIsAdministrator: boolean;
  targetIsBot: boolean;
  targetIsCurrentClaimer: boolean;
  /** The opener must never end up owning their own ticket as staff. */
  targetIsTicketOwner: boolean;
  /** The receiver has to be real staff — a guild staff role or Administrator. */
  targetIsStaffOrAdministrator: boolean;
}

export function decideTransferEligibility(input: TransferContextInput): Decision {
  if (!input.transferable) return { ok: false, reason: "NOT_TRANSFERABLE" };
  if (!input.ticketIsClaimed || input.ticketStatus !== TicketStatus.CLAIMED) {
    return { ok: false, reason: "NOT_CLAIMED" };
  }
  if (!input.actorIsClaimer && !input.actorIsAdministrator) {
    return { ok: false, reason: "NOT_ALLOWED" };
  }
  if (input.targetIsBot) return { ok: false, reason: "TARGET_IS_BOT" };
  if (input.targetIsCurrentClaimer) return { ok: false, reason: "TARGET_IS_CLAIMER" };
  if (input.targetIsTicketOwner) return { ok: false, reason: "TARGET_IS_OWNER" };
  if (!input.targetIsStaffOrAdministrator) return { ok: false, reason: "TARGET_NOT_STAFF" };
  return { ok: true };
}

export interface ManageContextInput {
  memberIsAdministrator: boolean;
  /** Whoever actually claimed the ticket — nobody else may manage it, not
   * even the support role or a ticket manager, until they claim it first. */
  memberIsClaimer: boolean;
}

export function decideManageAccess(input: ManageContextInput): boolean {
  return input.memberIsAdministrator || input.memberIsClaimer;
}

export function protectedTicketPrincipals(
  ticket: Pick<Ticket, "userId" | "claimedByDiscordId">,
  panel: Pick<TicketPanelConfig, "supportRoleId">,
): Set<string> {
  const ids = new Set<string>([ticket.userId]);
  // An unset support role is a placeholder id, not a principal to protect.
  if (!isUnsetId(panel.supportRoleId)) ids.add(panel.supportRoleId);
  if (ticket.claimedByDiscordId) ids.add(ticket.claimedByDiscordId);
  return ids;
}

export function memberIsAdministrator(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function memberIsTicketManager(member: GuildMember): boolean {
  if (memberIsAdministrator(member)) return true;
  return member.roles.cache.has(ticketMain.managerRoleId);
}

export function memberHasPanelSupportRole(
  member: GuildMember,
  panel: TicketPanelConfig,
): boolean {
  if (isUnsetId(panel.supportRoleId)) return false;
  return member.roles.cache.has(panel.supportRoleId);
}

export function canClaimTicket(
  member: GuildMember,
  panel: TicketPanelConfig,
  ticket: Pick<Ticket, "status" | "claimedBy" | "userId">,
): Decision {
  return decideClaimEligibility({
    memberHasSupportRole: memberHasPanelSupportRole(member, panel),
    memberIsManager: memberIsTicketManager(member),
    memberIsAdministrator: memberIsAdministrator(member),
    memberIsOwner: member.id === ticket.userId,
    claimer: panel.claimer,
    ticketStatus: ticket.status,
    alreadyClaimed: ticket.claimedBy != null,
    panelIsAdminOnly: panelIsAdminOnly(panel),
  });
}

/** A transfer target must be guild staff (any staff role) or an Administrator. */
export async function memberCanReceiveTickets(member: GuildMember): Promise<boolean> {
  if (memberIsAdministrator(member)) return true;
  return staffPermissionService.isStaff(member);
}

export async function canTransferTicket(
  actor: GuildMember,
  target: GuildMember,
  panel: TicketPanelConfig,
  ticket: Pick<Ticket, "status" | "claimedByDiscordId" | "userId">,
): Promise<Decision> {
  return decideTransferEligibility({
    transferable: panel.claimer.transferable,
    ticketStatus: ticket.status,
    ticketIsClaimed: !!ticket.claimedByDiscordId,
    actorIsClaimer: ticket.claimedByDiscordId === actor.id,
    actorIsAdministrator: memberIsAdministrator(actor),
    targetIsBot: target.user.bot,
    targetIsCurrentClaimer: ticket.claimedByDiscordId === target.id,
    targetIsTicketOwner: target.id === ticket.userId,
    targetIsStaffOrAdministrator: await memberCanReceiveTickets(target),
  });
}

export function canManageTicket(
  member: GuildMember,
  ticket: Pick<Ticket, "claimedByDiscordId">,
): boolean {
  return decideManageAccess({
    memberIsAdministrator: memberIsAdministrator(member),
    memberIsClaimer: !!ticket.claimedByDiscordId && ticket.claimedByDiscordId === member.id,
  });
}
