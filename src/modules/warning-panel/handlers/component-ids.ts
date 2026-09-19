export const WP_NS = "wp";

export const WarnPanelCustomId = {
  select: () => `${WP_NS}:select`,

  timeoutModal: () => `${WP_NS}:timeoutModal`,
  jailModal: () => `${WP_NS}:jailModal`,
  userWarnModal: () => `${WP_NS}:userWarnModal`,
  staffWarnModal: () => `${WP_NS}:staffWarnModal`,
} as const;

export const WarnPanelField = {
  user: "user",
  reason: "reason",
  evidence: "evidence",
  duration: "duration",
  verbal: "verbal",
} as const;

export function isWarnPanelCustomId(raw: string): boolean {
  return raw.startsWith(`${WP_NS}:`);
}

export function parseWarnPanelCustomId(raw: string): string | null {
  if (!isWarnPanelCustomId(raw)) return null;
  const [, action] = raw.split(":");
  return action ?? null;
}
