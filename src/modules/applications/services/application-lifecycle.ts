import { ticketEvents } from "../../tickets/services/ticket-events.ts";
import { ApplicationStatus, OPEN_APPLICATION_STATUSES } from "../shared/enums.ts";
import { StaffApplicationModel } from "../shared/staff-application.model.ts";
import { applicationTicketService } from "./application-ticket.service.ts";

let registered = false;

export function registerApplicationLifecycle(): void {
  if (registered) return;
  registered = true;

  ticketEvents.onRoleClaimed(async ({ guild, ticket }) => {
    const claimed = await StaffApplicationModel.findOneAndUpdate(
      { guildId: guild.id, ticketId: ticket.ticketId, applicationStatus: ApplicationStatus.PENDING },
      { $set: { applicationStatus: ApplicationStatus.CLAIMED } },
      { returnDocument: "after" },
    ).exec();
    if (claimed) await applicationTicketService.refreshPanel(guild, claimed.applicationId);
  });

  ticketEvents.onEnded(async ({ guild, ticket }) => {
    await StaffApplicationModel.updateMany(
      {
        guildId: guild.id,
        ticketId: ticket.ticketId,
        applicationStatus: { $in: [...OPEN_APPLICATION_STATUSES] },
      },
      { $set: { applicationStatus: ApplicationStatus.CLOSED } },
    ).exec();
  });
}

export async function markUnderReview(guildId: string, applicationId: string): Promise<void> {
  await StaffApplicationModel.updateOne(
    { guildId, applicationId, applicationStatus: ApplicationStatus.CLAIMED },
    { $set: { applicationStatus: ApplicationStatus.UNDER_REVIEW } },
  ).exec();
}
