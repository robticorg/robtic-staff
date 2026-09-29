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

export function rawDemoteLevel(currentLevel: number, amount: number | null): number {
  const step = amount === null || amount <= 0 ? 1 : amount;
  return currentLevel - step;
}

/** How far to move: a number of steps (null = 1), or straight to a level (e.g. a tier's first level). */
export type LevelMove = number | null | { level: number };

export interface MoveResolution {
  to: number;
  /**
   * The explicit level lies the wrong way — promoting an owner "to high" would be a
   * demotion. Nothing should change.
   */
  wrongWay: boolean;
}

export function resolveMove(
  direction: "promote" | "demote",
  currentLevel: number,
  move: LevelMove,
  ladder: readonly LadderRung[],
): MoveResolution {
  if (move !== null && typeof move === "object") {
    const wrongWay = direction === "promote" ? move.level <= currentLevel : move.level >= currentLevel;
    return { to: wrongWay ? currentLevel : move.level, wrongWay };
  }
  return {
    to:
      direction === "promote"
        ? resolvePromoteLevel(currentLevel, move, ladder)
        : rawDemoteLevel(currentLevel, move),
    wrongWay: false,
  };
}
