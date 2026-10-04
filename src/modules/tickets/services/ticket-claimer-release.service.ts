import type { Guild } from "discord.js";
import type { UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { panelIsAdminOnly, type TicketPanelConfig } from "../../../data/tickets/index.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { staffService } from "../../staff/services/staff.service.ts";
import {
  StaffOffDutyReason,
  staffDutyEvents,
  type StaffOffDutyEvent,
} from "../../staff/services/staff-duty-events.ts";
import { TicketModel, type Ticket } from "../models/ticket.model.ts";
import { buildClaimerOffDutyNotice } from "../render/claimer-off-duty.ts";
import { TicketLogAction, TicketStatus } from "../types/enums.ts";
import { ticketClaimCheckService } from "./ticket-claim-check.service.ts";
import { ticketConfigService } from "./ticket-config.service.ts";
import { ticketLogService } from "./ticket-log.service.ts";
import { ticketService } from "./ticket.service.ts";

const log = logger.child("tickets:claimer-release");
const M = ticketMessages.claimerOffDuty;
const RELEASABLE: readonly TicketStatus[] = [TicketStatus.OPEN, TicketStatus.CLAIMED];

type Slot = Ticket["claimableRoles"][number];

export interface ClaimRelease {
  wasMain: boolean;
  nextClaimerId: UserId | null;
  reopened: boolean;
}

export function planClaimRelease(
  ticket: Pick<Ticket, "claimedByDiscordId" | "claimableRoles">,
  userId: UserId,
): ClaimRelease {
  const wasMain = ticket.claimedByDiscordId === userId;
  const nextClaimerId = wasMain
    ? (ticket.claimableRoles.find((s) => s.claimedBy && s.claimedBy !== userId)?.claimedBy ?? null)
    : null;
  return { wasMain, nextClaimerId, reopened: wasMain && !nextClaimerId };
}

export function rolesToPing(
  panel: Pick<TicketPanelConfig, "supportRoleId"> | undefined,
  slots: readonly Pick<Slot, "roleId" | "claimedBy" | "closed">[],
  reopened: boolean,
): string[] {
  const roles = new Set<string>();
  if (reopened && panel && !panelIsAdminOnly(panel)) roles.add(panel.supportRoleId);
  for (const slot of slots) if (!slot.claimedBy && !slot.closed) roles.add(slot.roleId);
  return [...roles];
}

export class TicketClaimerReleaseService {
  private registered = false;

  register(): void {
    if (this.registered) return;
    this.registered = true;
    ticketClaimCheckService.useRelease({ release: (guild, event) => this.release(guild, event) });
    staffDutyEvents.onOffDuty((event) => ticketClaimCheckService.schedule(event));
  }

  async release(guild: Guild, event: StaffOffDutyEvent): Promise<number> {
    const tickets = await TicketModel.find({
      guildId: guild.id,
      status: { $in: RELEASABLE },
      $or: [{ claimedByDiscordId: event.userId }, { "claimableRoles.claimedBy": event.userId }],
    }).exec();

    let released = 0;
    for (const ticket of tickets) {
      try {
        if (await this.releaseOne(guild, ticket, event)) released += 1;
      } catch (err) {
        log.warn(`releasing ${event.userId} from ticket ${ticket.ticketId} failed`, err);
      }
    }
    if (released > 0) {
      log.info(`${event.userId} is off duty (${event.reason}) — released from ${released} ticket(s) in ${guild.id}`);
    }
    return released;
  }

  private async releaseOne(guild: Guild, ticket: Ticket, event: StaffOffDutyEvent): Promise<boolean> {
    const { userId } = event;
    const plan = planClaimRelease(ticket, userId);
    const holdsSlot = ticket.claimableRoles.some((s) => s.claimedBy === userId);

    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};
    const arrayFilters: Record<string, unknown>[] = [];

    if (holdsSlot) {
      unset["claimableRoles.$[mine].claimedBy"] = "";
      unset["claimableRoles.$[mine].claimedAt"] = "";
      arrayFilters.push({ "mine.claimedBy": userId });
    }
    if (plan.nextClaimerId) {
      const next = await staffService.ensure(plan.nextClaimerId, guild.id);
      Object.assign(set, { claimedBy: next._id, claimedByDiscordId: plan.nextClaimerId, claimedAt: new Date() });
    }
    if (plan.reopened) {
      set.status = TicketStatus.OPEN;
      Object.assign(unset, {
        claimedBy: "",
        claimedByDiscordId: "",
        claimedAt: "",
        transferredFrom: "",
        transferredAt: "",
        transferReason: "",
      });
      if (ticket.claimableRoles.some((s) => s.closed && !s.claimedBy)) {
        set["claimableRoles.$[shut].closed"] = false;
        arrayFilters.push({ "shut.closed": true, "shut.claimedBy": { $exists: false } });
      }
    }

    const updated = await TicketModel.findOneAndUpdate(
      {
        ticketId: ticket.ticketId,
        status: { $in: RELEASABLE },
        ...(plan.wasMain ? { claimedByDiscordId: userId } : { "claimableRoles.claimedBy": userId }),
      },
      {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      },
      { returnDocument: "after", ...(arrayFilters.length ? { arrayFilters } : {}) },
    ).exec();
    if (!updated) return false;

    const panel = ticketConfigService.getPanel(updated.panelId);
    const channel = await guild.channels.fetch(updated.channelId).catch(() => null);

    if (channel && "permissionOverwrites" in channel) {
      if (userId !== updated.userId) {
        await channel.permissionOverwrites.delete(userId).catch((err) => log.warn("claimer overwrite removal failed", err));
      }
      if (plan.reopened && panel && !panelIsAdminOnly(panel)) {
        await channel.permissionOverwrites
          .edit(panel.supportRoleId, { ViewChannel: true })
          .catch((err) => log.warn("support role overwrite restore failed", err));
      }
    }

    if (plan.wasMain && panel) ticketService.refreshTopic(guild, updated, panel);
    if (updated.claimableRoles.length > 0) await ticketService.refreshRoleClaimMessages(guild, updated);

    const pingRoleIds = rolesToPing(panel, updated.claimableRoles, plan.reopened);
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send(
          buildClaimerOffDutyNotice({
            ticketId: updated.ticketId,
            staffId: userId,
            onBreak: event.reason === StaffOffDutyReason.BREAK,
            pingRoleIds,
            claimable: !plan.nextClaimerId,
            movedToId: plan.nextClaimerId,
          }),
        )
        .catch((err) => log.warn(`off-duty notice for ${updated.ticketId} failed`, err));
    }

    if (panel) {
      await ticketLogService.record(TicketLogAction.TICKET_UNCLAIMED, {
        guild,
        panel,
        ticketId: updated.ticketId,
        actorId: event.actorId,
        fromId: userId,
        ...(plan.nextClaimerId ? { targetId: plan.nextClaimerId } : {}),
        reason: event.reason === StaffOffDutyReason.BREAK ? M.reasonBreak : M.reasonFired,
      });
    }
    return true;
  }
}

export const ticketClaimerReleaseService = new TicketClaimerReleaseService();
