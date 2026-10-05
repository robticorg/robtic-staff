export const RESPONSIBILITY_NS = "resp";

export const ResponsibilityCustomId = {
  addModal: () => `${RESPONSIBILITY_NS}:add`,
  category: (responsibilityId: string) => `${RESPONSIBILITY_NS}:cat:${responsibilityId}`,
  assign: (executorId: string, targetId: string) => `${RESPONSIBILITY_NS}:assign:${executorId}:${targetId}`,
  remove: (executorId: string, targetId: string) => `${RESPONSIBILITY_NS}:remove:${executorId}:${targetId}`,
  giveButton: (executorId: string, targetId: string) => `${RESPONSIBILITY_NS}:give:${executorId}:${targetId}`,
  takeButton: (executorId: string, targetId: string) => `${RESPONSIBILITY_NS}:take:${executorId}:${targetId}`,
  giveModal: (executorId: string, targetId: string) => `${RESPONSIBILITY_NS}:givem:${executorId}:${targetId}`,
  takeModal: (executorId: string, targetId: string) => `${RESPONSIBILITY_NS}:takem:${executorId}:${targetId}`,
} as const;

export const ResponsibilityField = {
  role: "role",
  permission: "permission",
  title: "title",
  description: "description",
  duration: "duration",
  pick: "pick",
} as const;

export interface ParsedResponsibilityId {
  action: string;
  args: string[];
}

export function parseResponsibilityCustomId(raw: string): ParsedResponsibilityId | null {
  if (!raw.startsWith(`${RESPONSIBILITY_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  return action ? { action, args } : null;
}
