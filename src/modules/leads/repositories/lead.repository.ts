import type { GuildId } from "../../../shared/types/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import { LeadModel, type Lead, type LeadDocument } from "../models/lead.model.ts";

export class LeadRepository extends BaseRepository<Lead> {
  constructor() {
    super(LeadModel);
  }

  byId(guildId: GuildId, leadId: string): Promise<LeadDocument | null> {
    return this.findOne({ guildId, leadId });
  }

  byName(guildId: GuildId, name: string): Promise<LeadDocument | null> {
    return this.findOne({ guildId, name });
  }

  listAll(guildId: GuildId): Promise<LeadDocument[]> {
    return LeadModel.find({ guildId }).sort({ createdAt: 1 }).exec();
  }
}

export const leadRepository = new LeadRepository();
