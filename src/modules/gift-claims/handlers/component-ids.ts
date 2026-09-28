export const GC_NS = "gc";

export const GiftClaimCustomId = {
  submitModal: () => `${GC_NS}:submit`,
  approve: (claimId: string) => `${GC_NS}:approve:${claimId}`,
  reject: (claimId: string) => `${GC_NS}:reject:${claimId}`,
  rejectModal: (claimId: string) => `${GC_NS}:rejmodal:${claimId}`,

  type: (claimId: string, type: string) => `${GC_NS}:type:${claimId}:${type}`,
  amountModal: (claimId: string) => `${GC_NS}:amount:${claimId}`,
  deliver: (claimId: string) => `${GC_NS}:deliver:${claimId}`,
  linkModal: (claimId: string) => `${GC_NS}:link:${claimId}`,
  proofModal: (claimId: string) => `${GC_NS}:proof:${claimId}`,
  retry: (claimId: string) => `${GC_NS}:retry:${claimId}`,
  reveal: (deliveryId: string) => `${GC_NS}:reveal:${deliveryId}`,

  cmdType: (draftId: string) => `${GC_NS}:ctype:${draftId}`,
  cmdAmountModal: (draftId: string) => `${GC_NS}:camount:${draftId}`,
  cmdLinkModal: (draftId: string) => `${GC_NS}:clink:${draftId}`,
  cmdProofModal: (draftId: string) => `${GC_NS}:cproof:${draftId}`,
} as const;

export const GiftClaimModalField = {
  reward: "reward",
  deliveryType: "deliveryType",
  details: "details",
  proof: "proof",
  rejectReason: "rejectReason",
  amount: "amount",
  link: "link",
  info: "info",
  deliveryProof: "deliveryProof",
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
