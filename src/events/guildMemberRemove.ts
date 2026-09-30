import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../libs/logger/index.ts";
import { memberPersistenceService } from "../modules/member-persistence/services/member-persistence.service.ts";
import { ticketMemberLeftService } from "../modules/tickets/services/ticket-member-left.service.ts";

const log = logger.child("member-remove");

export default defineEvent({
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    await memberPersistenceService.snapshotOnLeave(member);
    // Separate from the snapshot: a failure here must not stop roles being saved.
    await ticketMemberLeftService
      .notify(member.guild, member.id)
      .catch((err) => log.warn(`open-ticket notice for ${member.id} failed`, err));
  },
});
