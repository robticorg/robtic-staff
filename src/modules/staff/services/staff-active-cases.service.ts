import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";

const log = logger.child("staff:active-cases");

export interface ActiveCaseCounts {
  tickets: number;
  total: number;
}

export function totalActiveCases(counts: Omit<ActiveCaseCounts, "total">): number {
  return counts.tickets;
}

export class StaffActiveCasesService {
  async countForMember(guildId: GuildId, userId: UserId): Promise<ActiveCaseCounts> {
    const counts = { tickets: await this.countTickets(guildId, userId) };
    return { ...counts, total: totalActiveCases(counts) };
  }

  private async countTickets(guildId: GuildId, userId: UserId): Promise<number> {
    try {
      const [{ TicketModel }, { ACTIVE_TICKET_STATUSES }] = await Promise.all([
        import("../../tickets/models/ticket.model.ts"),
        import("../../tickets/types/enums.ts"),
      ]);
      return await TicketModel.countDocuments({
        guildId,
        claimedByDiscordId: userId,
        status: { $in: [...ACTIVE_TICKET_STATUSES] },
      }).exec();
    } catch (err) {
      return this.unavailable("tickets", err);
    }
  }

  private unavailable(kind: string, err: unknown): number {
    log.error(`active ${kind} lookup failed — treating as blocking`, err);
    return 1;
  }
}

export const staffActiveCasesService = new StaffActiveCasesService();
