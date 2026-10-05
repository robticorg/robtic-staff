import type { Guild, GuildMember } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { RESPONSIBILITY_APPLY_PANEL_ID } from "../../../data/tickets/panels/responsibility-apply.ts";
import { responsibilityApplyMessages } from "../../../data/tickets/responsibility-apply.ts";
import { hasAdminAccess } from "../../access/index.ts";
import { responsibilityAssignmentService, responsibilityService } from "../../responsibilities/index.ts";
import { TicketModel, type Ticket } from "../models/ticket.model.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { memberHoldsManagerRole } from "../services/ticket-permissions.ts";
import { ticketService } from "../services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../types/enums.ts";

const log = logger.child("tickets:responsibility-decision");
const D = responsibilityApplyMessages.decision;

export const ResponsibilityDecision = {
  ACCEPTED: "ACCEPTED",
  REFUSED: "REFUSED",
} as const;
export type ResponsibilityDecision = (typeof ResponsibilityDecision)[keyof typeof ResponsibilityDecision];

export interface DecisionResult {
  decision: ResponsibilityDecision;
  userId: string;
  title: string;
  reason: string | null;
}

class ResponsibilityDecisionError extends DomainError {
  constructor(message: string) {
    super("RESPONSIBILITY_DECISION", message);
  }
}

export function canDecide(input: { isAdministrator: boolean; holdsManagerRole: boolean; isApplicant: boolean }): boolean {
  if (input.isApplicant) return false;
  return input.isAdministrator || input.holdsManagerRole;
}

export class ResponsibilityDecisionService {
  async ticketFor(guildId: string, channelId: string): Promise<Ticket | null> {
    const ticket = await ticketService.getTicketByChannel(channelId);
    if (!ticket || ticket.guildId !== guildId || ticket.panelId !== RESPONSIBILITY_APPLY_PANEL_ID) return null;
    return (ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status) ? ticket : null;
  }

  async decide(input: {
    guild: Guild;
    actor: GuildMember;
    ticket: Ticket;
    decision: ResponsibilityDecision;
    reason: string | null;
  }): Promise<DecisionResult> {
    const { guild, actor, ticket } = input;
    const panel = ticketConfigService.getPanel(ticket.panelId);
    if (actor.id === ticket.userId) throw new ResponsibilityDecisionError(D.selfDecision);
    const allowed = canDecide({
      isAdministrator: hasAdminAccess(actor),
      holdsManagerRole: memberHoldsManagerRole(actor, panel),
      isApplicant: false,
    });
    if (!allowed) throw new ResponsibilityDecisionError(D.notManager);

    const reason = input.reason?.trim() || null;
    if (input.decision === ResponsibilityDecision.REFUSED && !reason) {
      throw new ResponsibilityDecisionError(D.reasonRequired);
    }

    const responsibilityId = (ticket.metadata?.responsibilityId as string | undefined) ?? null;
    const responsibility = responsibilityId ? await responsibilityService.getResponsibility(guild.id, responsibilityId) : null;
    if (!responsibility) throw new ResponsibilityDecisionError(D.noResponsibility);

    const claimed = await TicketModel.findOneAndUpdate(
      { ticketId: ticket.ticketId, "metadata.responsibilityDecision": { $exists: false } },
      {
        $set: {
          "metadata.responsibilityDecision": { status: input.decision, by: actor.id, at: new Date(), reason },
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!claimed) throw new ResponsibilityDecisionError(D.alreadyDecided);

    if (input.decision === ResponsibilityDecision.ACCEPTED) {
      try {
        await responsibilityAssignmentService.assignResponsibility({
          guild,
          executor: actor,
          targetId: ticket.userId,
          responsibilityId: responsibility.responsibilityId,
          preauthorized: true,
        });
      } catch (err) {
        await TicketModel.updateOne(
          { ticketId: ticket.ticketId },
          { $unset: { "metadata.responsibilityDecision": "" } },
        ).exec();
        throw err;
      }
    }

    await this.notify(guild, ticket.userId, input.decision, responsibility.title, reason);
    return { decision: input.decision, userId: ticket.userId, title: responsibility.title, reason };
  }

  private async notify(
    guild: Guild,
    userId: string,
    decision: ResponsibilityDecision,
    title: string,
    reason: string | null,
  ): Promise<void> {
    try {
      const user = await guild.client.users.fetch(userId);
      await user.send({
        content: decision === ResponsibilityDecision.ACCEPTED ? D.dmAccepted(title) : D.dmRefused(title, reason ?? "—"),
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      log.warn(`responsibility decision DM to ${userId} failed`, err);
    }
  }

  replyFor(result: DecisionResult): string {
    return result.decision === ResponsibilityDecision.ACCEPTED
      ? D.accepted(result.userId, result.title)
      : D.refused(result.userId, result.title, result.reason ?? "—");
  }
}

export const responsibilityDecisionService = new ResponsibilityDecisionService();
