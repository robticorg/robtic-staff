import type { RoleId } from "../../../shared/types/index.ts";
import {
  staffTransferRules,
  type CountBonus,
  type StaffTransferRules,
} from "../../../data/staff-application/config.ts";
import { STAFF_TIER_BOUNDARIES, StaffTier } from "../../configuration/types/enums.ts";
import type { StaffHierarchy } from "../../configuration/utils/staff-levels.ts";

const DAY_MS = 86_400_000;

export const TransferIneligibility = {
  MEMBER_COUNT: "MEMBER_COUNT",
} as const;
export type TransferIneligibility =
  (typeof TransferIneligibility)[keyof typeof TransferIneligibility];

export interface TransferEvaluationInput {
  sourceMemberCount: number;
  sourceOnlineCount: number;
  membershipDays: number;
}

export interface TransferEvaluation {
  eligible: boolean;
  ineligibleReasons: TransferIneligibility[];
  proposedTier: StaffTier | null;
  proposedStaffLevel: number | null;
  proposedStaffRoleId: RoleId | null;
  tierNotConfigured: boolean;
}

export interface EvaluationHierarchy {
  levels: readonly { roleId: RoleId; level: number }[];
  boundaryLevels: StaffHierarchy["boundaryLevels"];
}

const TIER_ORDER: readonly StaffTier[] = [StaffTier.STAFF, ...STAFF_TIER_BOUNDARIES];

function bestBonus(value: number, bands: readonly CountBonus[]): number {
  let levels = 0;
  for (const band of bands) if (value >= band.min && band.levels > levels) levels = band.levels;
  return levels;
}

export class StaffTransferEvaluationService {
  constructor(private readonly rules: StaffTransferRules = staffTransferRules) {}

  membershipDays(joinedAt: Date | null | undefined, now: Date = new Date()): number {
    if (!joinedAt) return 0;
    return Math.max(0, Math.floor((now.getTime() - joinedAt.getTime()) / DAY_MS));
  }

  evaluate(input: TransferEvaluationInput, hierarchy: EvaluationHierarchy): TransferEvaluation {
    const reasons: TransferIneligibility[] = [];
    if (input.sourceMemberCount < this.rules.minimumSourceMemberCount) {
      reasons.push(TransferIneligibility.MEMBER_COUNT);
    }
    const base: TransferEvaluation = {
      eligible: reasons.length === 0,
      ineligibleReasons: reasons,
      proposedTier: null,
      proposedStaffLevel: null,
      proposedStaffRoleId: null,
      tierNotConfigured: false,
    };
    if (reasons.length > 0) return base;

    const proposedTier = this.rules.targetTier;
    if (hierarchy.levels.length === 0) return base;

    const tierStart = hierarchy.boundaryLevels[proposedTier];
    if (tierStart === null || tierStart === undefined) {
      return { ...base, proposedTier, tierNotConfigured: true };
    }

    const bonus =
      bestBonus(input.sourceMemberCount, this.rules.memberCountBonus) +
      bestBonus(input.sourceOnlineCount, this.rules.onlineCountBonus) +
      bestBonus(input.membershipDays, this.rules.membershipBonus);
    const level = Math.max(tierStart, Math.min(tierStart + bonus, this.tierEnd(proposedTier, hierarchy)));

    return {
      ...base,
      proposedTier,
      proposedStaffLevel: level,
      proposedStaffRoleId: hierarchy.levels.find((rung) => rung.level === level)?.roleId ?? null,
    };
  }

  private tierEnd(tier: StaffTier, hierarchy: EvaluationHierarchy): number {
    const ladderTop = Math.max(...hierarchy.levels.map((rung) => rung.level));
    for (const next of TIER_ORDER.slice(TIER_ORDER.indexOf(tier) + 1)) {
      const start = hierarchy.boundaryLevels[next];
      if (start !== null && start !== undefined) return Math.min(start - 1, ladderTop);
    }
    return ladderTop;
  }
}

export const staffTransferEvaluationService = new StaffTransferEvaluationService();
