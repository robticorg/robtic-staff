import { panelCreatesChannel, type TicketPanelConfig } from "../../../data/tickets/index.ts";

export type TicketSetupProblem = "NOT_CONFIGURABLE" | "SUPPORT_REQUIRED" | "CATEGORY_REQUIRED";

type SetupPanel = Pick<TicketPanelConfig, "supportRoleOptional" | "createsChannel" | "categorySlot">;

export function isSetupConfigurable(panel: Pick<TicketPanelConfig, "createsChannel">): boolean {
  return panelCreatesChannel(panel);
}

export function ticketSetupProblem(
  panel: SetupPanel,
  input: { supportRoleId: string | null; categoryId: string | null },
): TicketSetupProblem | null {
  if (!isSetupConfigurable(panel)) return "NOT_CONFIGURABLE";
  if (!input.supportRoleId && !panel.supportRoleOptional) return "SUPPORT_REQUIRED";
  if (!input.categoryId && !panel.categorySlot) return "CATEGORY_REQUIRED";
  return null;
}
