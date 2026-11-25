import type { GuildId } from "../../shared/types/index.ts";
import type { FastAccessContext } from "../configuration/types/enums.ts";

export interface DetectedContext {
  context: FastAccessContext;
  referenceId: string;
}

/**
 * The special place a macro is used in, if any. Tickets were the only one and moved to Robtic Tickets, so every
 * channel is a plain (public) one now; kept as the one place to add contexts again.
 */
export async function detectFastAccessContext(
  _channelId: string,
  _guildId: GuildId,
): Promise<DetectedContext | null> {
  return null;
}
