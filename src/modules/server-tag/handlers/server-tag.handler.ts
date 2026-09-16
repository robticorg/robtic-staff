import type { GuildMember, PartialUser, User } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { TagTransition } from "../types/enums.ts";
import { getServerTagClient } from "../runtime.ts";
import {
  affectedGuildIds,
  serverTagService,
  type ServerTagOutcome,
  type TagUserLike,
} from "../services/server-tag.service.ts";

const log = logger.child("server-tag:handler");

export interface TagChangeResult {
  guildId: string;
  transition: TagTransition;
  outcome: ServerTagOutcome;
}

/**
 * Sits between the generic `userUpdate` event and the Server Tag domain (§4).
 * The event file stays a thin adapter; all routing decisions live here.
 */
export class ServerTagHandler {
  /**
   * A `userUpdate` fires for any profile change — username, avatar, banner.
   * Only guilds named by the old or new primary-guild identity can be affected,
   * and within those we act solely on a genuine state edge.
   */
  async handleUserUpdate(
    oldUser: User | PartialUser | null,
    newUser: User,
  ): Promise<TagChangeResult[]> {
    const client = getServerTagClient();
    if (!client) return [];

    const before: TagUserLike | null =
      oldUser && !oldUser.partial ? (oldUser as TagUserLike) : null;
    const results: TagChangeResult[] = [];

    for (const guildId of affectedGuildIds(before, newUser)) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue; // §28 — another server's tag is none of our business.

      const transition = serverTagService.detectTagState(before, newUser, guildId);
      if (transition === TagTransition.UNCHANGED) continue;

      try {
        const outcome =
          transition === TagTransition.ENABLED
            ? await serverTagService.handleTagAdded(guild, newUser.id)
            : await serverTagService.handleTagRemoved(guild, newUser.id);
        results.push({ guildId, transition, outcome });
      } catch (err) {
        log.error(`server tag ${transition} failed for ${newUser.id} in ${guildId}`, err);
      }
    }

    return results;
  }

  /** §12 — a returning member may have an ACTIVE restriction waiting for them. */
  async handleMemberJoin(member: GuildMember): Promise<ServerTagOutcome | null> {
    try {
      return await serverTagService.reconcileMember(member);
    } catch (err) {
      log.error(`server tag reconcile failed for ${member.id} in ${member.guild.id}`, err);
      return null;
    }
  }
}

export const serverTagHandler = new ServerTagHandler();
