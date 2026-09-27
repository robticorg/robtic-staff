import type { GuildMember } from "discord.js";
import { ConflictError } from "../../../shared/utils/errors.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { staffApplicationPanel } from "../../../data/staff-application/panels.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { isBlacklistedFor } from "../../tickets/services/ticket-blacklist.ts";
import { ticketService } from "../../tickets/services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../tickets/types/enums.ts";
import { ApplicationError } from "../shared/application-error.ts";
import { OPEN_APPLICATION_STATUSES, type ApplicationStatus } from "../shared/enums.ts";
import { StaffApplicationModel } from "../shared/staff-application.model.ts";

const V = staffApplicationMessages.validation;

export class ApplicationEligibilityService {
  async assertCanApply(member: GuildMember): Promise<void> {
    if (await isBlacklistedFor(member, staffApplicationPanel)) {
      throw new ApplicationError("APPLICATION_STAFF_BLACKLISTED", V.staffBlacklisted);
    }
    if (await staffPermissionService.isStaff(member)) {
      throw new ApplicationError("APPLICATION_ALREADY_STAFF", V.alreadyStaff);
    }

    const open = await StaffApplicationModel.find({
      guildId: member.guild.id,
      userId: member.id,
      applicationStatus: { $in: OPEN_APPLICATION_STATUSES as ApplicationStatus[] },
    }).exec();
    for (const application of open) {
      if (!application.ticketId) continue;
      const ticket = await ticketService.getTicket(application.ticketId);
      if (ticket && (ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status)) {
        throw new ConflictError(V.alreadyOpen(ticket.channelId));
      }
    }
  }
}

export const applicationEligibilityService = new ApplicationEligibilityService();
