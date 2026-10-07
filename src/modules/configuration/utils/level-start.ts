import type { GuildId } from "../../../shared/types/index.ts";
import { staffConfigService } from "../services/staff-config.service.ts";

/**
 * Ladder levels are stored from 0. A guild can choose (/start-count) to have them
 * shown and typed from 1 instead — only what people see and type shifts; stored
 * levels never change.
 */
export function getLevelStart(guildId: GuildId): Promise<number> {
  return staffConfigService.getLevelStart(guildId).catch(() => 0);
}

/** Stored level → the number shown to people. */
export const shownLevel = (level: number, start: number): number => level + start;

/** A number someone typed → the stored level. */
export const storedLevel = (typed: number, start: number): number => typed - start;
