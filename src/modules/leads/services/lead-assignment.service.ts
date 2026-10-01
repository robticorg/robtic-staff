import type { Guild } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { leadMessages } from "../../../data/leads/messages.ts";
import type { LeadAssignmentDocument } from "../models/lead-assignment.model.ts";
import { leadAssignmentRepository } from "../repositories/lead-assignment.repository.ts";
import { LeadError } from "../shared/lead-error.ts";
import { LeadAssignmentStatus, LeadHolderType } from "../types/enums.ts";
import { leadService } from "./lead.service.ts";

const E = leadMessages.errors;
const HISTORY_LIMIT = 10;

export interface LeadHolder {
  type: LeadHolderType;
  id: string;
}

export type AssignLeadResult =
  | { kind: "ASSIGNED"; assignment: LeadAssignmentDocument }
  | { kind: "REPLACED"; assignment: LeadAssignmentDocument; previous: LeadHolder };

export const describeHolder = (holder: LeadHolder): string => leadMessages.holder(holder.type, holder.id);

export class LeadAssignmentService {
  async validateHolder(guild: Guild, holder: LeadHolder): Promise<void> {
    if (holder.type === LeadHolderType.ROLE && holder.id === guild.id) {
      throw new LeadError("LEAD_EVERYONE", E.everyone);
    }
    if (holder.type === LeadHolderType.USER && holder.id === guild.client.user?.id) {
      throw new LeadError("LEAD_BOT", E.bot);
    }
  }

  async assignLead(input: {
    guild: Guild;
    leadId: string;
    holder: LeadHolder;
    replace: boolean;
    actorId: UserId;
    now?: Date;
  }): Promise<AssignLeadResult> {
    const lead = await leadService.requireLead(input.guild.id, input.leadId);
    await this.validateHolder(input.guild, input.holder);
    const now = input.now ?? new Date();

    const current = await leadAssignmentRepository.active(input.guild.id, lead.leadId);
    let previous: LeadHolder | null = null;
    if (current) {
      const currentHolder = { type: current.holderType, id: current.holderId };
      if (current.holderType === input.holder.type && current.holderId === input.holder.id) {
        throw new LeadError("LEAD_SAME_HOLDER", E.sameHolder(describeHolder(currentHolder)));
      }
      if (!input.replace) {
        throw new LeadError("LEAD_OCCUPIED", E.occupied(lead.name, describeHolder(currentHolder)));
      }
      const closed = await leadAssignmentRepository.close(
        current.assignmentId,
        LeadAssignmentStatus.REPLACED,
        input.actorId,
        now,
      );
      if (closed) previous = currentHolder;
    }

    try {
      const assignment = await leadAssignmentRepository.insert({
        guildId: input.guild.id,
        leadId: lead.leadId,
        holderType: input.holder.type,
        holderId: input.holder.id,
        previousHolderType: previous?.type ?? null,
        previousHolderId: previous?.id ?? null,
        assignedBy: input.actorId,
        assignedAt: now,
        status: LeadAssignmentStatus.ACTIVE,
      });
      return previous ? { kind: "REPLACED", assignment, previous } : { kind: "ASSIGNED", assignment };
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      const winner = await leadAssignmentRepository.active(input.guild.id, lead.leadId);
      throw new LeadError(
        "LEAD_OCCUPIED",
        E.occupied(lead.name, winner ? describeHolder({ type: winner.holderType, id: winner.holderId }) : "—"),
      );
    }
  }

  async removeLead(input: { guild: Guild; leadId: string; actorId: UserId }): Promise<LeadAssignmentDocument> {
    const lead = await leadService.requireLead(input.guild.id, input.leadId);
    const current = await leadAssignmentRepository.active(input.guild.id, lead.leadId);
    if (!current) throw new LeadError("LEAD_NO_HOLDER", E.noHolder(lead.name));
    const closed = await leadAssignmentRepository.close(current.assignmentId, LeadAssignmentStatus.REMOVED, input.actorId);
    if (!closed) throw new LeadError("LEAD_NO_HOLDER", E.noHolder(lead.name));
    return closed;
  }

  currentHolder(guildId: GuildId, leadId: string): Promise<LeadAssignmentDocument | null> {
    return leadAssignmentRepository.active(guildId, leadId);
  }

  history(guildId: GuildId, leadId: string): Promise<LeadAssignmentDocument[]> {
    return leadAssignmentRepository.history(guildId, leadId, HISTORY_LIMIT);
  }

  activeHolders(guildId: GuildId): Promise<LeadAssignmentDocument[]> {
    return leadAssignmentRepository.activeForGuild(guildId);
  }
}

export const leadAssignmentService = new LeadAssignmentService();
