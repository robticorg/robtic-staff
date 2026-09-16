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

export class ServerTagHandler {
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
      if (!guild) continue;

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
