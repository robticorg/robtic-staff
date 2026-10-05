export const PANEL_CONFIG_NS = "tcfg";

export const PanelConfigCustomId = {
  setup: () => `${PANEL_CONFIG_NS}:setup`,
  send: () => `${PANEL_CONFIG_NS}:send`,
} as const;

export const PanelConfigField = {
  type: "type",
  support: "support",
  manager: "manager",
  category: "category",
  panel: "panel",
  channel: "channel",
  title: "title",
  description: "description",
  image: "image",
} as const;

export function parsePanelConfigCustomId(raw: string): string | null {
  if (!raw.startsWith(`${PANEL_CONFIG_NS}:`)) return null;
  return raw.split(":")[1] ?? null;
}
