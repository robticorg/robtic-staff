import type { Guild } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import type { UserId } from "../../../shared/types/index.ts";
import type { Ticket } from "../models/ticket.model.ts";

const log = logger.child("tickets:events");

export interface TicketRoleClaimedEvent {
  guild: Guild;
  ticket: Ticket;
  roleId: string;
  claimerId: UserId;
}

export interface TicketEndedEvent {
  guild: Guild;
  ticket: Ticket;
  actorId: UserId;
}

type Listener<T> = (event: T) => Promise<void> | void;

class TicketEvents {
  private readonly roleClaimed: Listener<TicketRoleClaimedEvent>[] = [];
  private readonly ended: Listener<TicketEndedEvent>[] = [];

  onRoleClaimed(listener: Listener<TicketRoleClaimedEvent>): void {
    this.roleClaimed.push(listener);
  }

  onEnded(listener: Listener<TicketEndedEvent>): void {
    this.ended.push(listener);
  }

  emitRoleClaimed(event: TicketRoleClaimedEvent): Promise<void> {
    return this.run(this.roleClaimed, event, "roleClaimed");
  }

  emitEnded(event: TicketEndedEvent): Promise<void> {
    return this.run(this.ended, event, "ended");
  }

  private async run<T>(listeners: Listener<T>[], event: T, name: string): Promise<void> {
    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (err) {
        log.warn(`ticket ${name} listener failed`, err);
      }
    }
  }
}

export const ticketEvents = new TicketEvents();
