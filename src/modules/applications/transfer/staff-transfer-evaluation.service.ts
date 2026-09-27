import type { RoleId } from "../../../shared/types/index.ts";
import {
  SourceTier,
  staffTransferRules,
  type CountBonus,
  type StaffTransferRules,
} from "../../../data/staff-application/config.ts";
import { STAFF_TIER_BOUNDARIES, StaffTier } from "../../configuration/types/enums.ts";
import type { StaffHierarchy } from "../../configuration/utils/staff-levels.ts";

const DAY_MS = 86_400_000;

export const TransferIneligibility = {
  MEMBER_COUNT: "MEMBER_COUNT",
  SOURCE_TIER: "SOURCE_TIER",
} as const;
export type TransferIneligibility =
  (typeof TransferIneligibility)[keyof typeof TransferIneligibility];

export interface TransferEvaluationInput {
  sourceMemberCount: number;
  sourceOnlineCount: number;
  sourceRoleOrder: number;
  membershipDays: number;
}

export interface TransferEvaluation {
  eligible: boolean;
  ineligibleReasons: TransferIneligibility[];
  sourceTier: SourceTier;
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

  classifySourceRole(roleOrder: number): SourceTier {
    for (const band of this.rules.sourceTierBands) {
      if (roleOrder >= 1 && roleOrder <= band.maxRoleOrder) return band.tier;
    }
    return SourceTier.BELOW_OWNER;
  }

  evaluate(input: TransferEvaluationInput, hierarchy: EvaluationHierarchy): TransferEvaluation {
    const reasons: TransferIneligibility[] = [];
    if (input.sourceMemberCount < this.rules.minimumSourceMemberCount) {
      reasons.push(TransferIneligibility.MEMBER_COUNT);
    }
    const sourceTier = this.classifySourceRole(input.sourceRoleOrder);
    if (!this.rules.eligibleSourceTiers.includes(sourceTier)) {
      reasons.push(TransferIneligibility.SOURCE_TIER);
    }

    const base: TransferEvaluation = {
      eligible: reasons.length === 0,
      ineligibleReasons: reasons,
      sourceTier,
      proposedTier: null,
      proposedStaffLevel: null,
      proposedStaffRoleId: null,
      tierNotConfigured: false,
    };
    if (reasons.length > 0) return base;

    const proposedTier = this.rules.targetTierBySourceTier[sourceTier] ?? null;
    if (!proposedTier || hierarchy.levels.length === 0) return base;

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
