export const HIDDEN_NS = "hdn";

export const HiddenCustomId = {
  setLevel: (executorId: string, targetId: string) => `${HIDDEN_NS}:set:${executorId}:${targetId}`,
} as const;

export function parseHiddenCustomId(raw: string): { action: string; args: string[] } | null {
  if (!raw.startsWith(`${HIDDEN_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  return action ? { action, args } : null;
}
