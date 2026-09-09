import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { GuildId } from "../../../shared/types/index.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../../data/gift-claim/config.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { ticketConfigService } from "../../tickets/services/ticket-config.service.ts";

const UNSET = "000000000000000000";

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
    return role && role !== UNSET ? role : null;
  }

  async giftManagerRoleId(guildId: GuildId): Promise<string | null> {
    const row = await roleConfigService.getByType(guildId, RoleConfigType.GIFT_MANAGER);
    return row?.roleId ?? null;
  }

  async isGiftManager(member: GuildMember): Promise<boolean> {
    const panelRoleId = this.panelSupportRoleId();
    const configRoleId = await this.giftManagerRoleId(member.guild.id);
    return decideGiftManager({
      isAdministrator: member.permissions.has(PermissionFlagsBits.Administrator),
      hasPanelSupportRole: panelRoleId ? member.roles.cache.has(panelRoleId) : false,
      hasGiftManagerRole: configRoleId ? member.roles.cache.has(configRoleId) : false,
    });
  }
}

export const giftClaimPermissionService = new GiftClaimPermissionService();
