import type { ChannelId, RoleId } from "../../shared/types/index.ts";
import type { TicketPanelConfig } from "./types.ts";

export interface TicketPanelOverride {
  supportRoleId?: RoleId | null;
  managerRoleId?: RoleId | null;
  categoryId?: ChannelId | null;
  logChannelId?: ChannelId | null;
}

const overrides = new Map<string, TicketPanelOverride>();

export function setPanelOverride(panelId: string, override: TicketPanelOverride): void {
  overrides.set(panelId, { ...override });
}

export function clearPanelOverrides(): void {
  overrides.clear();
}

export function getPanelOverride(panelId: string): TicketPanelOverride | undefined {
  return overrides.get(panelId);
}

export function applyPanelOverride(panel: TicketPanelConfig): TicketPanelConfig {
  const override = overrides.get(panel.id);
  if (!override) return panel;
  return {
    ...panel,
    ...(override.supportRoleId ? { supportRoleId: override.supportRoleId } : {}),
    ...(override.managerRoleId ? { managerRoleId: override.managerRoleId } : {}),
    ...(override.categoryId ? { categoryId: override.categoryId, categorySlot: undefined } : {}),
    ...(override.logChannelId ? { logChannelId: override.logChannelId } : {}),
  };
}
