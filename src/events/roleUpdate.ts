import { Events, type Role } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";

/**
 * Fires for renames and colour changes too, so the position is checked first —
 * everything else can never move a role in or out of the ladder band.
 */
export default defineEvent({
  name: Events.GuildRoleUpdate,
  execute(oldRole: Role, newRole: Role) {
    if (oldRole.position === newRole.position) return;
    ladderSyncService.schedule(newRole.guild);
  },
});
