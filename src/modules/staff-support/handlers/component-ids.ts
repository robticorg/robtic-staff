export const SS_NS = "ss";

export const StaffSupportCustomId = {
  supportButton: () => `${SS_NS}:support`,
  breakButton: () => `${SS_NS}:break`,
  demissionButton: () => `${SS_NS}:demission`,

  supportModal: () => `${SS_NS}:supportModal`,
  demissionModal: () => `${SS_NS}:demissionModal`,

  fire: (requestId: string) => `${SS_NS}:fire:${requestId}`,
} as const;

export const StaffSupportModalField = {
  reason: "reason",
} as const;

export interface ParsedStaffSupportId {
  action: string;
  args: string[];
}

export function parseStaffSupportCustomId(raw: string): ParsedStaffSupportId | null {
  if (!raw.startsWith(`${SS_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}

export function isStaffSupportCustomId(raw: string): boolean {
  return raw.startsWith(`${SS_NS}:`);
}
