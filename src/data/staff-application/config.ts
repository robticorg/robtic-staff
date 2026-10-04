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

export interface CountBonus {
  min: number;
  levels: number;
}

export interface StaffTransferRules {
  minimumSourceMemberCount: number;
  targetTier: StaffTier;
  memberCountBonus: readonly CountBonus[];
  onlineCountBonus: readonly CountBonus[];
  membershipBonus: readonly CountBonus[];
}

export const staffTransferRules: StaffTransferRules = {
  minimumSourceMemberCount: 4000,

  targetTier: StaffTier.STAFF,

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
