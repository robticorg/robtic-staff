import type { Guild } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { leadMessages } from "../../../data/leads/messages.ts";
import { responsibilityService } from "../../responsibilities/index.ts";
import type { LeadDocument } from "../models/lead.model.ts";
import { leadRepository } from "../repositories/lead.repository.ts";
import { LeadError } from "../shared/lead-error.ts";
import { LeadTargetType } from "../types/enums.ts";

const E = leadMessages.errors;
const NAME_MAX = 60;
const DESCRIPTION_MAX = 200;

export interface LeadTarget {
  type: LeadTargetType;
  id: string;
}

export class LeadService {
  async validateTarget(guild: Guild, target: LeadTarget): Promise<void> {
    if (target.type === LeadTargetType.ROLE && target.id === guild.id) {
      throw new LeadError("LEAD_EVERYONE", E.everyone);
    }
    if (target.type === LeadTargetType.RESPONSIBILITY) {
      const responsibility = await responsibilityService.getResponsibility(guild.id, target.id);
      if (!responsibility) throw new LeadError("LEAD_RESPONSIBILITY_NOT_FOUND", E.responsibilityNotFound);
    }
  }

  async createLead(input: {
    guild: Guild;
    name: string;
    description: string;
    target: LeadTarget;
    createdBy: UserId;
  }): Promise<LeadDocument> {
    const name = input.name.trim().slice(0, NAME_MAX);
    const description = input.description.trim().slice(0, DESCRIPTION_MAX);
    if (!name || !description) throw new LeadError("LEAD_FIELDS", E.fieldsRequired);
    await this.validateTarget(input.guild, input.target);
    if (await leadRepository.byName(input.guild.id, name)) {
      throw new LeadError("LEAD_NAME_TAKEN", E.nameTaken(name));
    }
    try {
      return await leadRepository.insert({
        guildId: input.guild.id,
        name,
        description,
        targetType: input.target.type,
        targetId: input.target.id,
        createdBy: input.createdBy,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new LeadError("LEAD_NAME_TAKEN", E.nameTaken(name));
      throw err;
    }
  }

  async requireLead(guildId: GuildId, leadId: string): Promise<LeadDocument> {
    const lead = await leadRepository.byId(guildId, leadId);
    if (!lead) throw new LeadError("LEAD_NOT_FOUND", E.notFound);
    return lead;
  }

  getLeads(guildId: GuildId): Promise<LeadDocument[]> {
    return leadRepository.listAll(guildId);
  }

  async search(guildId: GuildId, query: string): Promise<LeadDocument[]> {
    const q = query.trim().toLowerCase();
    const all = await leadRepository.listAll(guildId);
    return (q ? all.filter((l) => l.name.toLowerCase().includes(q)) : all).slice(0, 25);
  }

  async describeTarget(guildId: GuildId, target: LeadTarget): Promise<string> {
    if (target.type === LeadTargetType.USER) return leadMessages.targetUser(target.id);
    if (target.type === LeadTargetType.ROLE) return leadMessages.targetRole(target.id);
    const responsibility = await responsibilityService.getResponsibility(guildId, target.id);
    return leadMessages.targetResponsibility(responsibility?.title ?? target.id);
  }
}

export const leadService = new LeadService();
