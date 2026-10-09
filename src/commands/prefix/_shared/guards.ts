import type { PrefixContext } from "../../../discord/prefix-command.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { ticketConfigService } from "../../../modules/tickets/index.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import type { TicketDocument } from "../../../modules/tickets/models/ticket.model.ts";
import { ACTIVE_TICKET_STATUSES, TicketStatus } from "../../../modules/tickets/types/enums.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import {
  ManagementAuthority,
  staffManagementAuthorizationService,
} from "../../../modules/staff/services/staff-management-authorization.service.ts";
import { StaffTier } from "../../../modules/configuration/types/enums.ts";

export class PrefixAbort extends DomainError {
  constructor(message = "") {
    super("PREFIX_ABORT", message);
  }
}

export async function requireStaff(ctx: PrefixContext): Promise<void> {
  if (!(await staffPermissionService.canActAsStaff(ctx.member))) {
    throw new PrefixAbort(prefixMessages.common.notStaff);
  }
}

export async function requireHighStaff(ctx: PrefixContext): Promise<void> {
  if (!(await staffPermissionService.isAtLeastTier(ctx.member, StaffTier.HIGHSTAFF))) {
    throw new PrefixAbort(prefixMessages.common.notHighStaff);
  }
}

export async function requireStaffManager(ctx: PrefixContext): Promise<void> {
  if (!(await staffPermissionService.isStaffManager(ctx.member))) {
    throw new PrefixAbort(prefixMessages.common.notStaffManager);
  }
}

/**
 * Staff Manager OR Owner Manager (or an administrator). What each may touch is
 * decided later by the authorization service — an owner manager can't move Ship,
 * a staff manager can't move Owner.
 */
export async function requireRankManager(ctx: PrefixContext): Promise<void> {
  const authority = await staffManagementAuthorizationService.getAuthority(ctx.member);
  if (authority.kind === ManagementAuthority.NONE) {
    throw new PrefixAbort(prefixMessages.common.notStaffManager);
  }
}

/** Apply Manager or Transfer Manager (or an administrator). */
export async function requireAcceptManager(ctx: PrefixContext): Promise<void> {
  if (!(await staffPermissionService.isAcceptManager(ctx.member))) {
    throw new PrefixAbort(prefixMessages.common.notAcceptManager);
  }
}

export interface TicketContext {
  ticket: TicketDocument;
  panel: TicketPanelConfig;
}

export interface ResolveTicketOptions {
  /**
   * Accept a CLOSED ticket whose channel is still around — the case a panel with
   * `close.delete: false` leaves behind. DELETED is still refused.
   */
  allowClosed?: boolean;
}

export async function resolveTicketContext(
  ctx: PrefixContext,
  options: ResolveTicketOptions = {},
): Promise<TicketContext> {
  // Outside a ticket the command simply doesn't apply — stay silent instead of
  // answering "not a ticket" in general chat.
  const ticket = await ticketService.getTicketByChannel(ctx.channel.id);
  if (!ticket || ticket.guildId !== ctx.guild.id) {
    throw new PrefixAbort();
  }

  const acceptable: TicketStatus[] = [
    ...(ACTIVE_TICKET_STATUSES as TicketStatus[]),
    ...(options.allowClosed ? [TicketStatus.CLOSED] : []),
  ];
  if (!acceptable.includes(ticket.status)) {
    throw new PrefixAbort(prefixMessages.ticket.ticketClosed);
  }
  const panel = ticketConfigService.getPanel(ticket.panelId, ticket.guildId);
  if (!panel) throw new PrefixAbort();
  return { ticket, panel };
}
