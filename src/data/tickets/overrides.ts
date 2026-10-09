import type { ChannelId, RoleId } from "../../shared/types/index.ts";
import type { TicketPanelConfig } from "./types.ts";

export interface TicketPanelOverride {
  supportRoleId?: RoleId | null;
  managerRoleId?: RoleId | null;
  categoryId?: ChannelId | null;
  logChannelId?: ChannelId | null;
}

/**
 * What `/ticket setup` saved, per server: each server has its own support role, category and log
 * room for a panel — setting up Support in one server never touches another.
 */
const overrides = new Map<string, TicketPanelOverride>();
const keyOf = (guildId: string, panelId: string) => `${guildId}:${panelId}`;

export function setPanelOverride(guildId: string, panelId: string, override: TicketPanelOverride): void {
  overrides.set(keyOf(guildId, panelId), { ...override });
}

export function clearPanelOverrides(): void {
  overrides.clear();
}

export function getPanelOverride(guildId: string, panelId: string): TicketPanelOverride | undefined {
  return overrides.get(keyOf(guildId, panelId));
}

/** The panel as set up in `guildId`; `null` = the code config only (names, ids — nothing server-specific). */
export function applyPanelOverride(panel: TicketPanelConfig, guildId: string | null): TicketPanelConfig {
  const override = guildId ? overrides.get(keyOf(guildId, panel.id)) : undefined;
  if (!override) return panel;
  return {
    ...panel,
    ...(override.supportRoleId ? { supportRoleId: override.supportRoleId } : {}),
    ...(override.managerRoleId ? { managerRoleId: override.managerRoleId } : {}),
    ...(override.categoryId ? { categoryId: override.categoryId, categorySlot: undefined } : {}),
    ...(override.logChannelId ? { logChannelId: override.logChannelId } : {}),
  };
}
