export type DmRoute =
  | { kind: "WIZARD" }
  | { kind: "RELAY"; caseId: string }
  | { kind: "CHOOSE_CASE"; caseIds: string[] }
  | { kind: "MENU" };

export interface DmRoutingInput {
  hasDraft: boolean;

  activeCaseId?: string;

  openCaseIds: readonly string[];
}

export function routeDm(input: DmRoutingInput): DmRoute {
  if (input.hasDraft) return { kind: "WIZARD" };

  const open = input.openCaseIds;
  if (input.activeCaseId && open.includes(input.activeCaseId)) {
    return { kind: "RELAY", caseId: input.activeCaseId };
  }
  if (open.length === 1) return { kind: "RELAY", caseId: open[0]! };
  if (open.length > 1) return { kind: "CHOOSE_CASE", caseIds: [...open] };
  return { kind: "MENU" };
}
