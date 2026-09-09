import type { TicketConfig, TicketPanelConfig } from "./types.ts";
import { ticketMain } from "./main.ts";
import { technicalPanel } from "./panels/technical.ts";
import { accountPanel } from "./panels/account.ts";
import { giftClaimPanel } from "./panels/gift-claim.ts";

export * from "./types.ts";
export { ticketMain } from "./main.ts";

export const tickets: TicketConfig = {
  main: ticketMain,
  panels: [technicalPanel, accountPanel, giftClaimPanel],
};

export const UNSET_ID = "000000000000000000";

export function listPanels(): readonly TicketPanelConfig[] {
  return tickets.panels;
}

export function getPanel(panelId: string): TicketPanelConfig | undefined {
  return tickets.panels.find((p) => p.id === panelId);
}

export function panelIds(): string[] {
  return tickets.panels.map((p) => p.id);
}
