import { UNSET_ID, type TicketConfig, type TicketPanelConfig } from "./types.ts";
import { ticketMain } from "./main.ts";
import { verifiedPanel } from "./panels/verified.ts";
import { supportPanel } from "./panels/support.ts";
import { giftClaimPanel } from "./panels/gift-claim.ts";
import { minecraftPanel } from "./panels/minecraft.ts";
import { staffSupportPanel } from "../staff-support/panels.ts";

export * from "./types.ts";
export { ticketMain } from "./main.ts";

export const tickets: TicketConfig = {
  main: ticketMain,
  panels: [
    supportPanel,
    minecraftPanel,
    verifiedPanel,
    giftClaimPanel,

    staffSupportPanel,
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

export function listPanels(): readonly TicketPanelConfig[] {
  return tickets.panels;
}

export function listPublicPanels(): readonly TicketPanelConfig[] {
  return tickets.panels.filter((p) => !p.hidden);
}

export function getPanel(panelId: string): TicketPanelConfig | undefined {
  return tickets.panels.find((p) => p.id === panelId);
}

export function panelIds(): string[] {
  return tickets.panels.map((p) => p.id);
}
