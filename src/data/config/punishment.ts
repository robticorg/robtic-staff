import { colors } from "./colors.ts";

export const punishmentConfig = {
  evidenceWindowDays: 3,
  maxEvidenceShown: 10,
  approvalColors: {
    pending: colors.warning,
    approved: colors.success,
    rejected: colors.error,
    expired: colors.neutral,
  },
} as const;

export const EVIDENCE_WINDOW_MS = punishmentConfig.evidenceWindowDays * 86_400_000;
