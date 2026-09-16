import { Events, type Role } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";

/**
 * A deleted rung leaves a hole in the numbering; deleting START or END leaves
 * no band at all, which `sync` reports and skips rather than guessing.
 */
export default defineEvent({
  name: Events.GuildRoleDelete,
  execute(role: Role) {
    ladderSyncService.schedule(role.guild);
  },
});
