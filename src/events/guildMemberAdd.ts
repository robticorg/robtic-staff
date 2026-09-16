import { Events, type GuildMember } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { serverTagHandler } from "../modules/server-tag/index.ts";

/**
 * §12 — a member who left mid-restriction keeps their row in MongoDB. On
 * rejoin we reconcile: settle it if it is already due or if the tag is back,
 * otherwise leave it running until it expires.
 */
export default defineEvent({
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    await serverTagHandler.handleMemberJoin(member);
  },
});
