import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { memberPersistenceService } from "../modules/member-persistence/services/member-persistence.service.ts";
import { serverTagHandler } from "../modules/server-tag/index.ts";
import { responsibilitySyncService } from "../modules/responsibilities/index.ts";

export default defineEvent({
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    await memberPersistenceService.recordRoleChange(oldMember, newMember);
    await serverTagHandler.handleMemberUpdate(oldMember, newMember);
    await responsibilitySyncService.handleMemberUpdate(oldMember, newMember);
  },
});
