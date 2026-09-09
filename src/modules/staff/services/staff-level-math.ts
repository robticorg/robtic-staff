import type { RoleId } from "../../../shared/types/index.ts";

export interface LadderRung {
  roleId: RoleId;
  level: number;
}

export function maxLadderLevel(ladder: readonly LadderRung[]): number {
  return ladder.reduce((max, r) => Math.max(max, r.level), 0);
}

export function rolesUpTo(ladder: readonly LadderRung[], targetLevel: number): RoleId[] {
  return ladder.filter((r) => r.level <= targetLevel).map((r) => r.roleId);
}

export function rolesAbove(ladder: readonly LadderRung[], targetLevel: number): RoleId[] {
  return ladder.filter((r) => r.level > targetLevel).map((r) => r.roleId);
}

export function resolveAcceptLevel(
  requested: number | null,
  ladder: readonly LadderRung[],
): number | null {
  const level = requested ?? 0;
  if (level < 0 || level > maxLadderLevel(ladder)) return null;
  return level;
}

export function resolvePromoteLevel(
  currentLevel: number,
  amount: number | null,
  ladder: readonly LadderRung[],
): number {
  const step = amount === null || amount <= 0 ? 1 : amount;
  return Math.min(currentLevel + step, maxLadderLevel(ladder));
}

export function resolveDemoteLevel(currentLevel: number, amount: number | null): number {
  const step = amount === null || amount <= 0 ? 1 : amount;
  return Math.max(currentLevel - step, 0);
}
