import { Events, type Role } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";

/**
 * A role created inside the START…END band is a new rung. The sync recomputes
 * the band and no-ops when the new role landed outside it.
 */
export default defineEvent({
  name: Events.GuildRoleCreate,
  execute(role: Role) {
    ladderSyncService.schedule(role.guild);
  },
});
