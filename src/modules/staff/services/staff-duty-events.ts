import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";

const log = logger.child("staff:duty-events");

export const StaffOffDutyReason = {
  FIRED: "FIRED",
  BREAK: "BREAK",
} as const;
export type StaffOffDutyReason = (typeof StaffOffDutyReason)[keyof typeof StaffOffDutyReason];
export const STAFF_OFF_DUTY_REASON_VALUES = Object.values(StaffOffDutyReason);

export interface StaffOffDutyEvent {
  guildId: GuildId;
  userId: UserId;
  actorId: string;
  reason: StaffOffDutyReason;
}

type Listener = (event: StaffOffDutyEvent) => Promise<unknown> | unknown;

class StaffDutyEvents {
  private readonly listeners: Listener[] = [];

  onOffDuty(listener: Listener): void {
    this.listeners.push(listener);
  }

  emitOffDuty(event: StaffOffDutyEvent): void {
    for (const listener of this.listeners) {
      void (async () => listener(event))().catch((err) =>
        log.warn(`off-duty listener failed for ${event.userId} (${event.reason})`, err),
      );
    }
  }
}

export const staffDutyEvents = new StaffDutyEvents();
