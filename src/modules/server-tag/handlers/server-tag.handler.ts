import type { GuildMember, PartialGuildMember, PartialUser, User } from "discord.js";
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

interface NameUserLike {
  username?: string | null;
  globalName?: string | null;
}

export function userNameChanged(
  oldUser: NameUserLike | null | undefined,
  newUser: NameUserLike,
): boolean {
  if (!oldUser) return false;
  return oldUser.globalName !== newUser.globalName || oldUser.username !== newUser.username;
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

    const handled = new Set<string>();
    for (const guildId of affectedGuildIds(before, newUser)) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const transition = serverTagService.detectTagState(before, newUser, guildId);
      if (transition === TagTransition.UNCHANGED) continue;
      handled.add(guildId);

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

    if (userNameChanged(before as NameUserLike | null, newUser)) {
      for (const guild of client.guilds.cache.values()) {
        if (handled.has(guild.id) || !guild.members.cache.has(newUser.id)) continue;
        const outcome = await this.reevaluate(guild.id, newUser.id);
        if (outcome) results.push({ guildId: guild.id, transition: TagTransition.UNCHANGED, outcome });
      }
    }

    return results;
  }

  async handleMemberUpdate(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ): Promise<ServerTagOutcome | null> {
    if (!oldMember.partial && oldMember.displayName === newMember.displayName) return null;
    return this.reevaluate(newMember.guild.id, newMember.id);
  }

  private async reevaluate(guildId: string, userId: string): Promise<ServerTagOutcome | null> {
    const guild = getServerTagClient()?.guilds.cache.get(guildId);
    if (!guild) return null;
    try {
      return await serverTagService.handleIdentityChange(guild, userId);
    } catch (err) {
      log.error(`identity re-check failed for ${userId} in ${guildId}`, err);
      return null;
    }
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
