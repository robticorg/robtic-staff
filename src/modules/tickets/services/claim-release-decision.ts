import { StaffStatus } from "../../staff/types/enums.ts";

export type ClaimReleaseDecision =
  | { action: "KEEP"; why: "ADMIN" | "STILL_STAFF" }
  | { action: "RELEASE" }
  | { action: "WAIT"; until: Date };

export interface ClaimReleaseFacts {
  isAdministrator: boolean;
  staffStatus: string | null;
  tagRemovedAt: Date | null;
  now: Date;
  tagGraceMs: number;
}

export function decideClaimRelease(facts: ClaimReleaseFacts): ClaimReleaseDecision {
  if (facts.isAdministrator) return { action: "KEEP", why: "ADMIN" };
  if (facts.staffStatus === StaffStatus.ACTIVE) return { action: "KEEP", why: "STILL_STAFF" };

  if (facts.tagRemovedAt) {
    const until = new Date(facts.tagRemovedAt.getTime() + facts.tagGraceMs);
    if (until > facts.now) return { action: "WAIT", until };
  }
  return { action: "RELEASE" };
}
