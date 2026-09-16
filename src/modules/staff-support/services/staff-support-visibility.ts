/**
 * Who may see a Staff Support ticket. Derived from the *applicant's* tier, so a
 * member never files a complaint into a channel their own manager can read.
 */
export const SupportAudience = {
  /** Below Owner — Staff Manager and Owner Manager. */
  STAFF_AND_OWNER_MANAGERS: "STAFF_AND_OWNER_MANAGERS",
  /** Owner tier — Owner Manager only; Staff Manager is excluded. */
  OWNER_MANAGER_ONLY: "OWNER_MANAGER_ONLY",
  /** Ship and above — Administrators only, granted by permission not by role. */
  ADMINISTRATORS_ONLY: "ADMINISTRATORS_ONLY",
} as const;
export type SupportAudience = (typeof SupportAudience)[keyof typeof SupportAudience];

export interface SupportVisibilityInput {
  /** Calculated Staff level of the applicant — never a Discord role position. */
  applicantLevel: number;
  ownerStartLevel: number | null;
  shipStartLevel: number | null;
}

/**
 * Pure, so the whole matrix is testable without Discord or MongoDB. An
 * unconfigured boundary simply means that tier does not exist yet, which
 * collapses to the wider audience rather than locking anybody out.
 */
export function decideSupportVisibility(input: SupportVisibilityInput): SupportAudience {
  if (input.shipStartLevel !== null && input.applicantLevel >= input.shipStartLevel) {
    return SupportAudience.ADMINISTRATORS_ONLY;
  }
  if (input.ownerStartLevel !== null && input.applicantLevel >= input.ownerStartLevel) {
    return SupportAudience.OWNER_MANAGER_ONLY;
  }
  return SupportAudience.STAFF_AND_OWNER_MANAGERS;
}
