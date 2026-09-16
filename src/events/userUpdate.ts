import { Events, type PartialUser, type User } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { serverTagHandler } from "../modules/server-tag/index.ts";

export default defineEvent({
  name: Events.UserUpdate,
  async execute(oldUser: User | PartialUser, newUser: User) {
    await serverTagHandler.handleUserUpdate(oldUser, newUser);
  },
});
