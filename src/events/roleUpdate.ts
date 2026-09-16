import { Events, type Role } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";

export default defineEvent({
  name: Events.GuildRoleUpdate,
  execute(oldRole: Role, newRole: Role) {
    if (oldRole.position === newRole.position) return;
    ladderSyncService.schedule(newRole.guild);
  },
});
