export const MM_NS = "mm";

export const CustomId = {
  menuReport: () => `${MM_NS}:menuReport`,

  targetModal: (ownerId: string) => `${MM_NS}:targetModal:${ownerId}`,

  openDetails: (ownerId: string) => `${MM_NS}:openDetails:${ownerId}`,

  detailsModal: (ownerId: string) => `${MM_NS}:detailsModal:${ownerId}`,

  submit: (ownerId: string) => `${MM_NS}:submit:${ownerId}`,

  cancel: (ownerId: string) => `${MM_NS}:cancel:${ownerId}`,

  claim: (caseId: string) => `${MM_NS}:claim:${caseId}`,

  info: (caseId: string) => `${MM_NS}:info:${caseId}`,

  status: (caseId: string, to: string) => `${MM_NS}:status:${caseId}:${to}`,

  pickCase: (caseId: string) => `${MM_NS}:pickCase:${caseId}`,
} as const;

export interface ParsedCustomId {
  action: string;
  args: string[];
}

export function parseCustomId(raw: string): ParsedCustomId | null {
  if (!raw.startsWith(`${MM_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}

export function isModmailCustomId(raw: string): boolean {
  return raw.startsWith(`${MM_NS}:`);
}
