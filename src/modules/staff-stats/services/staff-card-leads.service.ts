import type { Guild, GuildMember } from "discord.js";
import type { UserId } from "../../../shared/types/index.ts";
import {
  LeadHolderType,
  LeadTargetType,
  describeHolder,
  leadResolutionService,
  leadService,
  type LeadView,
} from "../../leads/index.ts";
import { responsibilityAssignmentService } from "../../responsibilities/index.ts";

export interface CardResponsibility {
  title: string;
  expiresAt: Date | null;
  leads: string[];
}

export interface CardLeads {
  responsibilities: CardResponsibility[];
  leadsOf: { name: string; holder: string }[];
  leading: { name: string; target: string }[];
}

const holderText = (view: LeadView): string => (view.holder ? describeHolder(view.holder) : "");

export class StaffCardLeadsService {
  async load(guild: Guild, userId: UserId, member: GuildMember | null): Promise<CardLeads> {
    const active = await responsibilityAssignmentService.getActiveResponsibilities(guild.id, userId);
    const byResponsibility = await leadResolutionService.forResponsibilities(
      guild.id,
      active.map((a) => a.responsibility.responsibilityId),
    );
    const { leadsOf, leading } = member
      ? await leadResolutionService.forMember(member)
      : { leadsOf: [], leading: [] };

    return {
      responsibilities: active.map((a) => ({
        title: a.responsibility.title,
        expiresAt: a.assignment.expiresAt ?? null,
        leads: (byResponsibility.get(a.responsibility.responsibilityId) ?? [])
          .filter((v) => !(v.holder?.type === LeadHolderType.USER && v.holder.id === userId))
          .map(holderText),
      })),
      leadsOf: leadsOf
        .filter((v) => v.targetType !== LeadTargetType.RESPONSIBILITY)
        .map((v) => ({ name: v.name, holder: holderText(v) })),
      leading: await Promise.all(
        leading.map(async (v) => ({
          name: v.name,
          target: await leadService.describeTarget(guild.id, { type: v.targetType, id: v.targetId }),
        })),
      ),
    };
  }
}

export const staffCardLeadsService = new StaffCardLeadsService();
