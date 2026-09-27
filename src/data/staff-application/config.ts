import { colors } from "../config/colors.ts";
import { staffSupportConfig } from "../staff-support/config.ts";
import { StaffTier } from "../../modules/configuration/types/enums.ts";

export const staffApplicationConfig = {
  applicationCategoryId: staffSupportConfig.staffSupportCategoryId,
  transferCategoryId: staffSupportConfig.staffSupportCategoryId,

  accentColor: colors.primary,

  minimumAge: 13,
  maximumAge: 99,

  draftTtlMs: 30 * 60_000,

  evidence: {
    minFiles: 2,
    maxFiles: 10,
    maxFileBytes: 8 * 1024 * 1024,
  },
} as const;

export const SourceTier = {
  SHIP: "SHIP",
  OWNER: "OWNER",
  BELOW_OWNER: "BELOW_OWNER",
} as const;
export type SourceTier = (typeof SourceTier)[keyof typeof SourceTier];

export interface CountBonus {
  min: number;
  levels: number;
}

export interface StaffTransferRules {
  minimumSourceMemberCount: number;
  sourceTierBands: readonly { tier: SourceTier; maxRoleOrder: number }[];
  eligibleSourceTiers: readonly SourceTier[];
  targetTierBySourceTier: Partial<Record<SourceTier, StaffTier>>;
  memberCountBonus: readonly CountBonus[];
  onlineCountBonus: readonly CountBonus[];
  membershipBonus: readonly CountBonus[];
}

export const staffTransferRules: StaffTransferRules = {
  minimumSourceMemberCount: 4000,

  sourceTierBands: [
    { tier: SourceTier.SHIP, maxRoleOrder: 3 },
    { tier: SourceTier.OWNER, maxRoleOrder: 8 },
  ],

  eligibleSourceTiers: [SourceTier.SHIP, SourceTier.OWNER],

  targetTierBySourceTier: {
    [SourceTier.SHIP]: StaffTier.HIGHSTAFF,
    [SourceTier.OWNER]: StaffTier.STAFF,
  },

  memberCountBonus: [
    { min: 4000, levels: 1 },
    { min: 10000, levels: 2 },
    { min: 20000, levels: 3 },
  ],

  onlineCountBonus: [
    { min: 300, levels: 1 },
    { min: 500, levels: 2 },
  ],

  membershipBonus: [
    { min: 30, levels: 1 },
    { min: 90, levels: 2 },
    { min: 180, levels: 3 },
  ],
};

export const staffRecruitmentRules = {
  recruiterMinimumTier: StaffTier.OWNER as StaffTier,
} as const;
