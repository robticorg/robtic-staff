import type { GuildId, UserId } from "../../../shared/types/index.ts";

export interface TicketRef {
  ticketId: string;
  guildId: GuildId;
  claimedBy?: UserId;
  completedBy?: UserId;
  createdAt?: Date;
  claimedAt?: Date;
  completedAt?: Date;
}
