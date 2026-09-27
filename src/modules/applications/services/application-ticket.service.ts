import type { Guild, GuildMember } from "discord.js";
import type { RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import {
  staffApplicationPanel,
  staffTransferApplicationPanel,
} from "../../../data/staff-application/panels.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { ticketService } from "../../tickets/services/ticket.service.ts";
import { buildApplicationPanel } from "../render/application-panel.ts";
import { ApplicationType } from "../shared/enums.ts";
import {
  StaffApplicationModel,
  type StaffApplicationDocument,
} from "../shared/staff-application.model.ts";
import { transferEvidenceService } from "../transfer/transfer-evidence.service.ts";

const log = logger.child("applications:ticket");

export interface OpenApplicationTicketInput {
  guild: Guild;
  member: GuildMember;
  application: StaffApplicationDocument;
  managerRoleIds: readonly RoleId[];
}

export interface OpenedApplicationTicket {
  ticketId: string;
  channelId: string;
}

export class ApplicationTicketService {
  panelFor(type: ApplicationType): TicketPanelConfig {
    return type === ApplicationType.TRANSFER_APPLICATION
      ? staffTransferApplicationPanel
      : staffApplicationPanel;
  }

  async open(input: OpenApplicationTicketInput): Promise<OpenedApplicationTicket> {
    const { guild, member, application, managerRoleIds } = input;
    const panel = this.panelFor(application.type);

    const { ticket, channel } = await ticketService.createTicket({
      guild,
      panel,
      member,
      answers: [],
      duplicateScope: "PANEL",
      claimableRoleIds: managerRoleIds,
      metadata: { workflow: panel.id, applicationId: application.applicationId },
    });

    await StaffApplicationModel.updateOne(
      { applicationId: application.applicationId },
      { $set: { ticketId: ticket.ticketId } },
    ).exec();

    await channel
      .send({
        content: [`<@${member.id}>`, ...managerRoleIds.map((id) => `<@&${id}>`)].join(" "),
        allowedMentions: { users: [member.id], roles: [...managerRoleIds] },
      })
      .catch(() => undefined);

    const panelMessage = await channel
      .send(buildApplicationPanel(ticket.ticketId, application, managerRoleIds))
      .catch((err) => {
        log.warn(`application panel for ${application.applicationId} failed`, err);
        return null;
      });
    if (panelMessage) {
      await StaffApplicationModel.updateOne(
        { applicationId: application.applicationId },
        { $set: { panelMessageId: panelMessage.id } },
      ).exec();
    }

    if (application.type === ApplicationType.TRANSFER_APPLICATION) {
      await transferEvidenceService.postToChannel(channel, application.applicationId);
    }

    await ticketService.announceClaimableRoles(ticket.ticketId, guild);
    return { ticketId: ticket.ticketId, channelId: channel.id };
  }

  async refreshPanel(guild: Guild, applicationId: string): Promise<void> {
    const application = await StaffApplicationModel.findOne({ applicationId }).exec();
    if (!application?.ticketId || !application.panelMessageId) return;
    const ticket = await ticketService.getTicket(application.ticketId);
    if (!ticket) return;
    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const message = await channel.messages.fetch(application.panelMessageId).catch(() => null);
    await message
      ?.edit(
        buildApplicationPanel(
          ticket.ticketId,
          application,
          ticket.claimableRoles.map((slot) => slot.roleId),
        ),
      )
      .catch((err) => log.warn(`application panel refresh failed for ${applicationId}`, err));
  }
}

export const applicationTicketService = new ApplicationTicketService();
