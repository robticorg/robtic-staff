import type { RoleId } from "../../../shared/types/index.ts";

/** The only role facts the ladder range cares about. */
export interface LadderRoleLike {
  id: RoleId;
  position: number;
  /** Integration-managed roles (bots, boosts) can never be a rung. */
  managed?: boolean;
}

export const LadderProblem = {
  START_MISSING: "START_MISSING",
  END_MISSING: "END_MISSING",
  END_BELOW_START: "END_BELOW_START",
} as const;
export type LadderProblem = (typeof LadderProblem)[keyof typeof LadderProblem];

export type LadderOrderResult =
  | { ok: true; ordered: RoleId[] }
  | { ok: false; problem: LadderProblem };

export interface LadderOrderInput {
  roles: Iterable<LadderRoleLike>;
  startRoleId: RoleId;
  endRoleId: RoleId;
  /** @everyone — never a rung, and its position collides with the range floor. */
  everyoneRoleId?: RoleId;
  /** Ignored / access / slot roles: inside the range but off the ladder. */
  excludedRoleIds?: Iterable<RoleId>;
}

/**
 * The ladder *is* the Discord role order between START and END — it is derived,
 * never typed in. Anything sitting in that band belongs to the ladder unless it
 * is explicitly excluded, so a role created or dragged into the band joins the
 * calculation and one dragged out of it leaves.
 */
export function orderLadderRoles(input: LadderOrderInput): LadderOrderResult {
  const roles = [...input.roles];
  const start = roles.find((r) => r.id === input.startRoleId);
  if (!start) return { ok: false, problem: LadderProblem.START_MISSING };
  const end = roles.find((r) => r.id === input.endRoleId);
  if (!end) return { ok: false, problem: LadderProblem.END_MISSING };

  if (start.id === end.id) return { ok: true, ordered: [start.id] };
  if (end.position <= start.position) {
    return { ok: false, problem: LadderProblem.END_BELOW_START };
  }

  // START and END are rungs by definition — being configured as something else
  // must not drop them out of their own range.
  const excluded = new Set<RoleId>(input.excludedRoleIds ?? []);
  excluded.delete(start.id);
  excluded.delete(end.id);

  const inRange = roles.filter((role) => {
    if (input.everyoneRoleId && role.id === input.everyoneRoleId) return false;
    if (role.id === start.id || role.id === end.id) return true;
    if (role.position < start.position || role.position > end.position) return false;
    if (excluded.has(role.id)) return false;
    if (role.managed) return false;
    return true;
  });

  inRange.sort((a, b) => a.position - b.position);

  const middle = inRange.filter((r) => r.id !== start.id && r.id !== end.id).map((r) => r.id);
  return { ok: true, ordered: [start.id, ...middle, end.id] };
}

export function sameLadder(a: readonly RoleId[], b: readonly RoleId[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
