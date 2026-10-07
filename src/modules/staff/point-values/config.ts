import { StaffPointTransactionType as T } from "../types/enums.ts";

/** The point types the bot awards by itself — the ones /points values can change. */
export const POINT_VALUE_GROUPS = {
  claims: [T.TICKET_CLAIM, T.REPORT_CLAIM, T.STAFF_ACCEPT],
  moderation: [T.USER_WARNING, T.STAFF_WARNING, T.JAIL, T.APPEAL_SUCCESS_PENALTY],
} as const;
export type PointValueGroup = keyof typeof POINT_VALUE_GROUPS;
export const POINT_VALUE_GROUP_KEYS = Object.keys(POINT_VALUE_GROUPS) as PointValueGroup[];

export const POINT_VALUE_LIMIT = 1000;

export const POINT_VALUES_NS = "ptval";
export const PointValuesCustomId = {
  open: (group: PointValueGroup) => `${POINT_VALUES_NS}:open:${group}`,
  modal: (group: PointValueGroup) => `${POINT_VALUES_NS}:modal:${group}`,
} as const;

export function parsePointValuesCustomId(raw: string): { action: string; group: PointValueGroup } | null {
  if (!raw.startsWith(`${POINT_VALUES_NS}:`)) return null;
  const [, action, group] = raw.split(":");
  if (!action || !group || !(group in POINT_VALUE_GROUPS)) return null;
  return { action, group: group as PointValueGroup };
}

/** "5", " -2 " → number; anything else (empty, 1.5, abc, out of range) → null. */
export function parsePointValue(raw: string): number | null {
  const value = raw.trim();
  if (!/^-?\d+$/.test(value)) return null;
  const n = Number(value);
  return Math.abs(n) <= POINT_VALUE_LIMIT ? n : null;
}
