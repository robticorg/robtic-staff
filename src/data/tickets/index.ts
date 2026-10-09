import { UNSET_ID, type TicketConfig, type TicketPanelConfig } from "./types.ts";
import { ticketMain } from "./main.ts";
import { verifiedPanel } from "./panels/verified.ts";
import { supportPanel } from "./panels/support.ts";
import { giftClaimPanel } from "./panels/gift-claim.ts";
import { minecraftPanel } from "./panels/minecraft.ts";
import { responsibilityApplyPanel } from "./panels/responsibility-apply.ts";
import { staffSupportPanel } from "../staff-support/panels.ts";
import {
  staffApplicationPanel,
  staffTransferApplicationPanel,
} from "../staff-application/panels.ts";

import { applyPanelOverride } from "./overrides.ts";

export * from "./types.ts";
export * from "./overrides.ts";
export { ticketMain } from "./main.ts";

export const tickets: TicketConfig = {
  main: ticketMain,
  panels: [
    supportPanel,
    minecraftPanel,
    verifiedPanel,
    giftClaimPanel,

    staffSupportPanel,
    staffApplicationPanel,
    staffTransferApplicationPanel,
    responsibilityApplyPanel,
  ],
};

export function isUnsetId(id: string | undefined | null): boolean {
  return !id || id === UNSET_ID;
}

export function panelIsAdminOnly(panel: Pick<TicketPanelConfig, "supportRoleId">): boolean {
  return isUnsetId(panel.supportRoleId);
}

export function panelCreatesChannel(
  panel: Pick<TicketPanelConfig, "createsChannel">,
): boolean {
  return panel.createsChannel !== false;
}

/**
 * Panels as set up in `guildId` (support role, category, log room are per server). Pass `null`
 * only when nothing server-specific is used — a name or an id.
 */
export function listPanels(guildId: string | null): readonly TicketPanelConfig[] {
  return tickets.panels.map((p) => applyPanelOverride(p, guildId));
}

export function listPublicPanels(guildId: string | null): readonly TicketPanelConfig[] {
  return listPanels(guildId).filter((p) => !p.hidden);
}

export function getPanel(panelId: string, guildId: string | null): TicketPanelConfig | undefined {
  const panel = tickets.panels.find((p) => p.id === panelId);
  return panel ? applyPanelOverride(panel, guildId) : undefined;
}

export const LEGACY_TICKET_PREFIX = "ticket";

export function ticketPrefixOf(panel: Pick<TicketPanelConfig, "id" | "ticketPrefix">): string {
  return (panel.ticketPrefix ?? panel.id).toLowerCase();
}

export function ticketCounterKey(guildId: string, prefix: string): string {
  return prefix === LEGACY_TICKET_PREFIX ? `ticket:${guildId}` : `ticket:${guildId}:${prefix}`;
}

export function ticketPrefixes(): string[] {
  return [...new Set(tickets.panels.map(ticketPrefixOf))];
}

export function independentPanelIds(): string[] {
  return tickets.panels.filter((p) => p.independent).map((p) => p.id);
}

export function panelIds(): string[] {
  return tickets.panels.map((p) => p.id);
}
