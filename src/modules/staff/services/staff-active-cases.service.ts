import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";

const log = logger.child("staff:active-cases");

export interface ActiveCaseCounts {
  reports: number;
  tickets: number;
  appeals: number;
  giftClaims: number;
  total: number;
}

export function totalActiveCases(counts: Omit<ActiveCaseCounts, "total">): number {
  return counts.reports + counts.tickets + counts.appeals + counts.giftClaims;
}

/**
 * Work a Staff member currently *owns*. Ownership, not participation: a ticket
 * they claimed, a report they claimed, an appeal they claimed, a gift claim they
 * approved but have not fulfilled yet.
 *
 * Every model is imported lazily — the ticket, modmail, appeal and gift-claim
 * modules all depend on the Staff module, so a static import here would close a
 * cycle.
 */
export class StaffActiveCasesService {
  async countForMember(guildId: GuildId, userId: UserId): Promise<ActiveCaseCounts> {
    const [reports, tickets, appeals, giftClaims] = await Promise.all([
      this.countReports(guildId, userId),
      this.countTickets(guildId, userId),
      this.countAppeals(guildId, userId),
      this.countGiftClaims(guildId, userId),
    ]);
    const counts = { reports, tickets, appeals, giftClaims };
    return { ...counts, total: totalActiveCases(counts) };
  }

  private async countReports(guildId: GuildId, userId: UserId): Promise<number> {
    try {
      const [{ ModmailCaseModel }, { OPEN_CASE_STATUSES }] = await Promise.all([
        import("../../modmail/models/modmail-case.model.ts"),
        import("../../modmail/types/enums.ts"),
      ]);
      return await ModmailCaseModel.countDocuments({
        guildId,
        claimedByDiscordId: userId,
        status: { $in: [...OPEN_CASE_STATUSES] },
      }).exec();
    } catch (err) {
      return this.unavailable("reports", err);
    }
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

  private async countAppeals(guildId: GuildId, userId: UserId): Promise<number> {
    try {
      const [{ AppealModel }, { OPEN_APPEAL_STATUSES }] = await Promise.all([
        import("../../appeals/models/appeal.model.ts"),
        import("../../appeals/types/enums.ts"),
      ]);
      return await AppealModel.countDocuments({
        guildId,
        claimedBy: userId,
        status: { $in: [...OPEN_APPEAL_STATUSES] },
      }).exec();
    } catch (err) {
      return this.unavailable("appeals", err);
    }
  }

  /**
   * A gift claim has no claimer — the open obligation is one this member
   * approved and still owes the fulfilment for.
   */
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

  /**
   * A count we could not take is not proof of "none open". Reported as one
   * blocking case so the transfer refuses rather than proceeding blind.
   */
  private unavailable(kind: string, err: unknown): number {
    log.error(`active ${kind} lookup failed — treating as blocking`, err);
    return 1;
  }
}

export const staffActiveCasesService = new StaffActiveCasesService();
