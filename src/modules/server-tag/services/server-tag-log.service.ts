import type { UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { getServerTagClient } from "../runtime.ts";

const log = logger.child("server-tag:dm");

/** DMs to staff about their tag restriction. Nothing is posted to a server channel. */
export class ServerTagLogService {
  async dm(userId: UserId, content: string): Promise<boolean> {
    try {
      const client = getServerTagClient();
      if (!client) return false;
      const user = await client.users.fetch(userId);
      const channel = await user.createDM();
      await channel.send({ content, allowedMentions: { parse: [] } });
      return true;
    } catch (err) {
      log.warn(`server tag DM to ${userId} failed`, err);
      return false;
    }
  }
}

export const serverTagLogService = new ServerTagLogService();
