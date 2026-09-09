export const VAC_NS = "vac";

export const VacCustomId = {
  applyButton: () => `${VAC_NS}:apply`,
  applyModal: () => `${VAC_NS}:applyModal`,

  approve: (vacationId: string) => `${VAC_NS}:approve:${vacationId}`,
  refuse: (vacationId: string) => `${VAC_NS}:refuse:${vacationId}`,
  info: (vacationId: string) => `${VAC_NS}:info:${vacationId}`,
  refuseModal: (vacationId: string) => `${VAC_NS}:refModal:${vacationId}`,
} as const;

export const VacModalField = {
  reason: "reason",
  duration: "duration",
  refuseReason: "refuseReason",
} as const;

export interface ParsedVacId {
  action: string;
  args: string[];
}

export function parseVacCustomId(raw: string): ParsedVacId | null {
  if (!raw.startsWith(`${VAC_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}

export function isVacationCustomId(raw: string): boolean {
  return raw.startsWith(`${VAC_NS}:`);
}
