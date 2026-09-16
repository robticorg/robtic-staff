import { Events, type Role } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";

export default defineEvent({
  name: Events.GuildRoleDelete,
  execute(role: Role) {
    ladderSyncService.schedule(role.guild);
  },
});
