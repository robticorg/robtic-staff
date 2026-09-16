import { Events, type GuildMember } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { serverTagHandler } from "../modules/server-tag/index.ts";

export default defineEvent({
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    await serverTagHandler.handleMemberJoin(member);
  },
});
