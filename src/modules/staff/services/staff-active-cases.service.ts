import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";

const log = logger.child("staff:active-cases");

export interface ActiveCaseCounts {
  tickets: number;
  giftClaims: number;
  total: number;
}

export function totalActiveCases(counts: Omit<ActiveCaseCounts, "total">): number {
  return counts.tickets + counts.giftClaims;
}

export class StaffActiveCasesService {
  async countForMember(guildId: GuildId, userId: UserId): Promise<ActiveCaseCounts> {
    const [tickets, giftClaims] = await Promise.all([
      this.countTickets(guildId, userId),
      this.countGiftClaims(guildId, userId),
    ]);
    const counts = { tickets, giftClaims };
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

  private async countGiftClaims(guildId: GuildId, userId: UserId): Promise<number> {
    try {
      const [{ GiftClaimModel }, { GiftClaimStatus }] = await Promise.all([
        import("../../gift-claims/models/gift-claim.model.ts"),
        import("../../gift-claims/types/enums.ts"),
      ]);
      return await GiftClaimModel.countDocuments({
        guildId,
        reviewedBy: userId,
        status: GiftClaimStatus.APPROVED,
      }).exec();
    } catch (err) {
      return this.unavailable("gift claims", err);
    }
  }

  private unavailable(kind: string, err: unknown): number {
    log.error(`active ${kind} lookup failed — treating as blocking`, err);
    return 1;
  }
}

export const staffActiveCasesService = new StaffActiveCasesService();
