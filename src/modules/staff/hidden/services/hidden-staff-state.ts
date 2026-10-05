import type { Guild, GuildMember } from "discord.js";
import type { UserId } from "../../../../shared/types/index.ts";
import { hiddenStaffRepository } from "../repositories/hidden-staff.repository.ts";
import { hiddenStaffHierarchyService } from "./hidden-staff-hierarchy.service.ts";

export async function hiddenLevelOf(member: GuildMember): Promise<number> {
  return hiddenStaffHierarchyService.getHighestHiddenStaffLevel(member);
}

export async function isHiddenStaffMember(guild: Guild, userId: UserId, member?: GuildMember | null): Promise<boolean> {
  const resolved = member ?? (await guild.members.fetch(userId).catch(() => null));
  if (resolved) return (await hiddenLevelOf(resolved)) > 0;
  return hiddenStaffRepository.isActive(guild.id, userId);
}
