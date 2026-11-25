import type { Guild, GuildMember } from "discord.js";
import type { UserId } from "../../../shared/types/index.ts";
import {
  LeadTargetType,
  describeHolder,
  leadResolutionService,
  leadService,
  type LeadView,
} from "../../leads/index.ts";

export interface CardLeads {
  leadsOf: { name: string; holder: string }[];
  leading: { name: string; target: string }[];
}

const holderText = (view: LeadView): string => (view.holder ? describeHolder(view.holder) : "");

export class StaffCardLeadsService {
  async load(guild: Guild, _userId: UserId, member: GuildMember | null): Promise<CardLeads> {
    const { leadsOf, leading } = member
      ? await leadResolutionService.forMember(member)
      : { leadsOf: [], leading: [] };

    return {
      leadsOf: leadsOf
        .filter((v) => v.targetType !== LeadTargetType.RESPONSIBILITY)
        .map((v) => ({ name: v.name, holder: holderText(v) })),
      leading: await Promise.all(
        leading
          .filter((v) => v.targetType !== LeadTargetType.RESPONSIBILITY)
          .map(async (v) => ({
            name: v.name,
            target: await leadService.describeTarget(guild.id, { type: v.targetType, id: v.targetId }),
          })),
      ),
    };
  }
}

export const staffCardLeadsService = new StaffCardLeadsService();
