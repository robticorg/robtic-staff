import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { TicketClaimerConfig, TicketPanelConfig } from "../../../data/tickets/index.ts";
import { ticketMain } from "../../../data/tickets/index.ts";
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
  claimer: TicketClaimerConfig;
  ticketStatus: TicketStatus;
  alreadyClaimed: boolean;
}

export function decideClaimEligibility(input: ClaimContextInput): Decision {
  const eligibleRole =
    input.memberIsAdministrator ||
    (input.memberHasSupportRole && input.claimer.supportRoleCanClaim) ||
    (input.memberIsManager && input.claimer.managersCanClaim);

  if (!eligibleRole) return { ok: false, reason: "NOT_ELIGIBLE" };
  if (input.ticketStatus !== TicketStatus.OPEN) return { ok: false, reason: "NOT_OPEN" };
  if (input.alreadyClaimed) return { ok: false, reason: "ALREADY_CLAIMED" };
  return { ok: true };
}

export interface ManageContextInput {
  memberHasSupportRole: boolean;
  memberIsManager: boolean;
  memberIsAdministrator: boolean;
  memberIsClaimer: boolean;
  ticketClaimed: boolean;
}

export function decideManageAccess(input: ManageContextInput): boolean {
  if (input.memberIsAdministrator || input.memberIsManager) return true;
  if (!input.ticketClaimed) return input.memberHasSupportRole;
  return input.memberIsClaimer;
}

export function protectedTicketPrincipals(
  ticket: Pick<Ticket, "userId" | "claimedByDiscordId">,
  panel: Pick<TicketPanelConfig, "supportRoleId">,
): Set<string> {
  const ids = new Set<string>([ticket.userId, panel.supportRoleId]);
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
  return member.roles.cache.has(panel.supportRoleId);
}

export function canClaimTicket(
  member: GuildMember,
  panel: TicketPanelConfig,
  ticket: Pick<Ticket, "status" | "claimedBy">,
): Decision {
  return decideClaimEligibility({
    memberHasSupportRole: memberHasPanelSupportRole(member, panel),
    memberIsManager: memberIsTicketManager(member),
    memberIsAdministrator: memberIsAdministrator(member),
    claimer: panel.claimer,
    ticketStatus: ticket.status,
    alreadyClaimed: ticket.claimedBy != null,
  });
}

export function canManageTicket(
  member: GuildMember,
  panel: TicketPanelConfig,
  ticket: Pick<Ticket, "claimedBy" | "claimedByDiscordId">,
): boolean {
  return decideManageAccess({
    memberHasSupportRole: memberHasPanelSupportRole(member, panel),
    memberIsManager: memberIsTicketManager(member),
    memberIsAdministrator: memberIsAdministrator(member),
    memberIsClaimer: !!ticket.claimedByDiscordId && ticket.claimedByDiscordId === member.id,
    ticketClaimed: ticket.claimedBy != null,
  });
}
