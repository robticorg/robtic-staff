import type { GuildMember } from "discord.js";
import type { LeadAssignmentDocument } from "../models/lead-assignment.model.ts";
import type { LeadDocument } from "../models/lead.model.ts";
import { LeadHolderType, LeadTargetType } from "../types/enums.ts";
import { leadRepository } from "../repositories/lead.repository.ts";
import { leadAssignmentRepository } from "../repositories/lead-assignment.repository.ts";

export interface LeadSubject {
  userId: string;
  roleIds: readonly string[];
}

export interface LeadView {
  leadId: string;
  name: string;
  targetType: LeadTargetType;
  targetId: string;
  holder: { type: LeadHolderType; id: string } | null;
}

export interface MemberLeads {
  leadsOf: LeadView[];
  leading: LeadView[];
}

type LeadLike = Pick<LeadDocument, "leadId" | "name" | "targetType" | "targetId">;
type HolderLike = Pick<LeadAssignmentDocument, "leadId" | "holderType" | "holderId">;

export function buildLeadViews(leads: readonly LeadLike[], holders: readonly HolderLike[]): LeadView[] {
  const byLead = new Map(holders.map((h) => [h.leadId, h]));
  return leads.map((l) => {
    const h = byLead.get(l.leadId);
    return {
      leadId: l.leadId,
      name: l.name,
      targetType: l.targetType,
      targetId: l.targetId,
      holder: h ? { type: h.holderType, id: h.holderId } : null,
    };
  });
}

export function isHeldBy(view: LeadView, subject: LeadSubject): boolean {
  if (!view.holder) return false;
  if (view.holder.type === LeadHolderType.USER) return view.holder.id === subject.userId;
  return subject.roleIds.includes(view.holder.id);
}

export function matchesTarget(view: LeadView, subject: LeadSubject): boolean {
  if (view.targetType === LeadTargetType.USER) return view.targetId === subject.userId;
  if (view.targetType === LeadTargetType.ROLE) return subject.roleIds.includes(view.targetId);
  // Responsibility targets are from before responsibilities were removed: they match no one.
  return false;
}

export function resolveLeads(views: readonly LeadView[], subject: LeadSubject): MemberLeads {
  return {
    leadsOf: views.filter((v) => v.holder && matchesTarget(v, subject) && !isHeldBy(v, subject)),
    leading: views.filter((v) => isHeldBy(v, subject)),
  };
}

export class LeadResolutionService {
  async forMember(member: GuildMember): Promise<MemberLeads> {
    const guildId = member.guild.id;
    const [leads, holders] = await Promise.all([
      leadRepository.listAll(guildId),
      leadAssignmentRepository.activeForGuild(guildId),
    ]);
    if (leads.length === 0) return { leadsOf: [], leading: [] };
    return resolveLeads(buildLeadViews(leads, holders), {
      userId: member.id,
      roleIds: [...member.roles.cache.keys()],
    });
  }
}

export const leadResolutionService = new LeadResolutionService();
