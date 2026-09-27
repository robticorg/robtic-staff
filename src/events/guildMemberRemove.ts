import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { memberPersistenceService } from "../modules/member-persistence/services/member-persistence.service.ts";

export default defineEvent({
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    await memberPersistenceService.snapshotOnLeave(member);
  },
});
