export const SupportAudience = {
  STAFF_AND_OWNER_MANAGERS: "STAFF_AND_OWNER_MANAGERS",

  OWNER_MANAGER_ONLY: "OWNER_MANAGER_ONLY",

  ADMINISTRATORS_ONLY: "ADMINISTRATORS_ONLY",
} as const;
export type SupportAudience = (typeof SupportAudience)[keyof typeof SupportAudience];

export interface SupportVisibilityInput {
  applicantLevel: number;
  ownerStartLevel: number | null;
  shipStartLevel: number | null;
}

export function decideSupportVisibility(input: SupportVisibilityInput): SupportAudience {
  if (input.shipStartLevel !== null && input.applicantLevel >= input.shipStartLevel) {
    return SupportAudience.ADMINISTRATORS_ONLY;
  }
  if (input.ownerStartLevel !== null && input.applicantLevel >= input.ownerStartLevel) {
    return SupportAudience.OWNER_MANAGER_ONLY;
  }
  return SupportAudience.STAFF_AND_OWNER_MANAGERS;
}
