import type { GuildMember } from "discord.js";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";

export function blacklistSlotFor(
  panel: Pick<TicketPanelConfig, "blacklistSlot">,
): RoleConfigType | null {
  return panel.blacklistSlot === undefined ? RoleConfigType.TICKET_BLACKLIST : panel.blacklistSlot;
}

export async function isBlacklistedFor(
  member: GuildMember,
  panel: Pick<TicketPanelConfig, "blacklistSlot">,
): Promise<boolean> {
  const slot = blacklistSlotFor(panel);
  if (!slot) return false;
  const row = await roleConfigService.getByType(member.guild.id, slot);
  return !!row && member.roles.cache.has(row.roleId);
}
