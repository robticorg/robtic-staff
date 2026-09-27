import type { GuildId } from "../../../shared/types/index.ts";
import type { TicketDocument } from "../../tickets/models/ticket.model.ts";
import { ticketService } from "../../tickets/services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../tickets/types/enums.ts";
import {
  StaffApplicationModel,
  type StaffApplicationDocument,
} from "../shared/staff-application.model.ts";

export interface ApplicationContext {
  ticket: TicketDocument;
  application: StaffApplicationDocument;
}

function isActive(ticket: TicketDocument): boolean {
  return (ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status);
}

export class ApplicationContextService {
  async forChannel(guildId: GuildId, channelId: string): Promise<ApplicationContext | null> {
    const ticket = await ticketService.getTicketByChannel(channelId);
    if (!ticket || ticket.guildId !== guildId || !isActive(ticket)) return null;
    const application = await StaffApplicationModel.findOne({
      guildId,
      ticketId: ticket.ticketId,
    }).exec();
    return application ? { ticket, application } : null;
  }

  async forApplication(guildId: GuildId, applicationId: string): Promise<ApplicationContext | null> {
    const application = await StaffApplicationModel.findOne({ applicationId }).exec();
    if (!application || application.guildId !== guildId || !application.ticketId) return null;
    const ticket = await ticketService.getTicket(application.ticketId);
    if (!ticket || ticket.guildId !== guildId || !isActive(ticket)) return null;
    return { ticket, application };
  }
}

export const applicationContextService = new ApplicationContextService();
