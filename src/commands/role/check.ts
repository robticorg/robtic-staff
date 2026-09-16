import {
  STAFF_TIER_LABELS,
  STAFF_TIER_OPENS_LABELS,
  hierarchyMessages,
} from "../../data/messages/hierarchy.ts";
import {
  RoleKind,
  getTierForRole,
  validateHierarchy,
  type HierarchyIssue,
  type StaffHierarchy,
} from "../../modules/configuration/utils/staff-levels.ts";
import type { RoleId } from "../../shared/types/index.ts";

const M = hierarchyMessages.roleCheck;
const P = hierarchyMessages.problems;

/** Human-readable Arabic for each hierarchy configuration problem (§19). */
export function describeHierarchyIssues(issues: readonly HierarchyIssue[]): string[] {
  return issues.map((issue) => {
    const label = issue.tier ? STAFF_TIER_LABELS[issue.tier] : "";
    switch (issue.problem) {
      case "START_NOT_CONFIGURED":
        return P.START_NOT_CONFIGURED;
      case "END_NOT_CONFIGURED":
        return P.END_NOT_CONFIGURED;
      case "STAFF_ROLE_NOT_CONFIGURED":
        return P.STAFF_ROLE_NOT_CONFIGURED;
      case "BOUNDARY_NOT_ON_LADDER":
        return P.BOUNDARY_NOT_ON_LADDER(label);
      case "BOUNDARY_OUT_OF_ORDER":
        return P.BOUNDARY_OUT_OF_ORDER(label);
    }
  });
}

export interface RoleCheckView {
  ok: boolean;
  lines: string[];
}

/**
 * §18 — presentation only. Every number and tier here comes from
 * `getTierForRole`, the same call `/scan` and the rest of the Staff system use.
 */
export function buildRoleCheckView(hierarchy: StaffHierarchy, roleId: RoleId): RoleCheckView {
  const issues = validateHierarchy(hierarchy);
  if (issues.length > 0) {
    // §19 — refuse to show a level that may be wrong.
    return { ok: false, lines: [P.heading, ...describeHierarchyIssues(issues)] };
  }

  const info = getTierForRole(hierarchy, roleId);
  const lines = [M.role(roleId)];

  if (info.kind === RoleKind.IGNORED) {
    // §15 — ignored roles never get a level or a tier.
    lines.push(M.status(M.ignored), M.noLevel, M.ignoredNote);
    return { ok: true, lines };
  }

  if (info.kind === RoleKind.OUTSIDE) {
    // §16 — outside the ladder entirely.
    lines.push(M.status(M.outside), M.outsideNote);
    return { ok: true, lines };
  }

  lines.push(M.level(info.level as number));
  lines.push(M.tier(STAFF_TIER_LABELS[info.tier!]));

  // §17 — boundary roles say which tier they open; START/END are called out.
  const statuses: string[] = [];
  if (info.opensTier) statuses.push(STAFF_TIER_OPENS_LABELS[info.opensTier]);
  if (info.isStart) statuses.push(M.isStart);
  if (info.isEnd) statuses.push(M.isEnd);
  for (const status of statuses) lines.push(M.status(status));

  return { ok: true, lines };
}
