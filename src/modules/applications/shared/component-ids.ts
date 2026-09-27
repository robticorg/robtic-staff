export const AP_NS = "ap";

export const ApplicationCustomId = {
  firstModal: () => `${AP_NS}:first`,
  startApply: () => `${AP_NS}:startApply`,
  gender: () => `${AP_NS}:gender`,
  department: () => `${AP_NS}:department`,
  startTransfer: () => `${AP_NS}:startTransfer`,
  transferModal: () => `${AP_NS}:transferModal`,
  evidenceButton: () => `${AP_NS}:evidence`,
  evidenceModal: () => `${AP_NS}:evidenceModal`,
  info: (applicationId: string) => `${AP_NS}:info:${applicationId}`,
} as const;

export const ApplicationField = {
  identity: "identity",
  type: "type",
  recruiter: "recruiter",
  terms: "terms",
  memberCount: "memberCount",
  onlineCount: "onlineCount",
  roleOrder: "roleOrder",
  invite: "invite",
  evidence: "evidence",
} as const;

export interface ParsedApplicationId {
  action: string;
  args: string[];
}

export function parseApplicationCustomId(raw: string): ParsedApplicationId | null {
  if (!raw.startsWith(`${AP_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}
