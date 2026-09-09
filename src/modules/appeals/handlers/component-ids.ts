export const APL_NS = "apl";

export const AplCustomId = {
  start: (punishmentId: string) => `${APL_NS}:start:${punishmentId}`,
  appealModal: (punishmentId: string) => `${APL_NS}:form:${punishmentId}`,

  claim: (appealId: string) => `${APL_NS}:claim:${appealId}`,
  accept: (appealId: string) => `${APL_NS}:accept:${appealId}`,
  reject: (appealId: string) => `${APL_NS}:reject:${appealId}`,
  info: (appealId: string) => `${APL_NS}:info:${appealId}`,
  decisionModal: (appealId: string, decision: "accept" | "reject") =>
    `${APL_NS}:decide:${appealId}:${decision}`,
} as const;

export const AplModalField = {
  reason: "reason",
  evidence: "evidence",
  decisionReason: "decisionReason",
} as const;

export interface ParsedAplId {
  action: string;
  args: string[];
}

export function parseAplCustomId(raw: string): ParsedAplId | null {
  if (!raw.startsWith(`${APL_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}

export function isAppealCustomId(raw: string): boolean {
  return raw.startsWith(`${APL_NS}:`);
}
