export const STAFF_INFO_NS = "sinf";

export const StaffInfoCustomId = {
  select: () => `${STAFF_INFO_NS}:select`,
  page: (infoId: string, page: number) => `${STAFF_INFO_NS}:page:${infoId}:${page}`,
  addModal: () => `${STAFF_INFO_NS}:addModal`,
  pageModal: (infoId: string) => `${STAFF_INFO_NS}:pageModal:${infoId}`,
} as const;

export const StaffInfoField = {
  name: "name",
  description: "description",
  content: "content",
} as const;

export interface ParsedStaffInfoId {
  action: string;
  args: string[];
}

export function parseStaffInfoCustomId(raw: string): ParsedStaffInfoId | null {
  if (!raw.startsWith(`${STAFF_INFO_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  return action ? { action, args } : null;
}
