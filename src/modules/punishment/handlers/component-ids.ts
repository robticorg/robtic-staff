export const PUN_NS = "pun";

export const PunCustomId = {
  resolveSelect: (caseId: string, ownerId: string) => `${PUN_NS}:resolve:${caseId}:${ownerId}`,
  reasonModal: (caseId: string, type: string) => `${PUN_NS}:reason:${caseId}:${type}`,

  approve: (approvalId: string) => `${PUN_NS}:approve:${approvalId}`,
  reject: (approvalId: string) => `${PUN_NS}:reject:${approvalId}`,
  info: (approvalId: string) => `${PUN_NS}:info:${approvalId}`,
  rejectModal: (approvalId: string) => `${PUN_NS}:rejmodal:${approvalId}`,

  whyInfo: (punishmentId: string) => `${PUN_NS}:why:${punishmentId}`,
} as const;

export const PunModalField = {
  reason: "reason",
  duration: "duration",
  rejectReason: "rejectReason",
} as const;

export interface ParsedPunId {
  action: string;
  args: string[];
}

export function parsePunCustomId(raw: string): ParsedPunId | null {
  if (!raw.startsWith(`${PUN_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}

export function isPunishmentCustomId(raw: string): boolean {
  return raw.startsWith(`${PUN_NS}:`);
}
