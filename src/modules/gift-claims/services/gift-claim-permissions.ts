import { type GuildMember } from "discord.js";
import type { GuildId } from "../../../shared/types/index.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../../data/gift-claim/config.ts";
import { isUnsetId } from "../../../data/tickets/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { ticketConfigService } from "../../tickets/services/ticket-config.service.ts";
import { responsibilityPermissionService } from "../../responsibilities/services/responsibility-permission.service.ts";
import { hasAdminAccess } from "../../access/index.ts";

export function decideGiftManager(input: {
  isAdministrator: boolean;
  hasPanelSupportRole: boolean;
  hasGiftManagerRole: boolean;
}): boolean {
  return input.isAdministrator || input.hasPanelSupportRole || input.hasGiftManagerRole;
}

export class GiftClaimPermissionService {
  panelSupportRoleId(): string | null {
    const role = ticketConfigService.getPanel(GIFT_CLAIM_PANEL_ID)?.supportRoleId;

    return isUnsetId(role) ? null : (role ?? null);
  }

  async giftManagerRoleId(guildId: GuildId): Promise<string | null> {
    const row = await roleConfigService.getByType(guildId, RoleConfigType.GIFT_MANAGER);
    return row?.roleId ?? null;
  }

  async isGiftManager(member: GuildMember): Promise<boolean> {
    const panelRoleId = this.panelSupportRoleId();
    return decideGiftManager({
      isAdministrator: hasAdminAccess(member),
      hasPanelSupportRole: panelRoleId ? member.roles.cache.has(panelRoleId) : false,
      hasGiftManagerRole: await responsibilityPermissionService.holds(member, RoleConfigType.GIFT_MANAGER),
    });
  }
}

export const giftClaimPermissionService = new GiftClaimPermissionService();
