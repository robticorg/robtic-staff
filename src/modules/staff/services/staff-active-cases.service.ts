import type { GuildId, UserId } from "../../../shared/types/index.ts";

export interface ActiveCaseCounts {
  tickets: number;
  total: number;
}

export function totalActiveCases(counts: Omit<ActiveCaseCounts, "total">): number {
  return counts.tickets;
}

/**
 * Open work that blocks moving a staff member to another account. Tickets moved to Robtic Tickets, so the Staff bot
 * has none of its own to count; kept so !transfer keeps one place to add future checks.
 */
export class StaffActiveCasesService {
  async countForMember(_guildId: GuildId, _userId: UserId): Promise<ActiveCaseCounts> {
    return { tickets: 0, total: 0 };
  }
}

export const staffActiveCasesService = new StaffActiveCasesService();
