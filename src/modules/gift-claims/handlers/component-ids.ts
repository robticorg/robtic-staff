export const GC_NS = "gc";

export const GiftClaimCustomId = {
  submitModal: () => `${GC_NS}:submit`,
  approve: (claimId: string) => `${GC_NS}:approve:${claimId}`,
  reject: (claimId: string) => `${GC_NS}:reject:${claimId}`,
  done: (claimId: string) => `${GC_NS}:done:${claimId}`,
  rejectModal: (claimId: string) => `${GC_NS}:rejmodal:${claimId}`,
  fulfillModal: (claimId: string) => `${GC_NS}:fulmodal:${claimId}`,
} as const;

export const GiftClaimModalField = {
  reward: "reward",
  details: "details",
  proof: "proof",
  rejectReason: "rejectReason",
  fulfillProof: "fulfillProof",
} as const;

export interface ParsedGcId {
  action: string;
  args: string[];
}

export function parseGiftClaimCustomId(raw: string): ParsedGcId | null {
  if (!raw.startsWith(`${GC_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}

export function isGiftClaimCustomId(raw: string): boolean {
  return raw.startsWith(`${GC_NS}:`);
}
