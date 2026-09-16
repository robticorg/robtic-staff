import { Events, type PartialUser, type User } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { serverTagHandler } from "../modules/server-tag/index.ts";

/**
 * Thin adapter only — Server Tag business logic lives in ServerTagHandler (§4).
 *
 * discord.js raises `userUpdate` for any profile change it notices. For other
 * users that signal arrives through GUILD_MEMBER_UPDATE, which is why the
 * client requests the privileged GuildMembers intent.
 */
export default defineEvent({
  name: Events.UserUpdate,
  async execute(oldUser: User | PartialUser, newUser: User) {
    await serverTagHandler.handleUserUpdate(oldUser, newUser);
  },
});
