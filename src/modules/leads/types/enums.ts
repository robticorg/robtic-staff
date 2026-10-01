export const LeadTargetType = {
  USER: "USER",
  ROLE: "ROLE",
  RESPONSIBILITY: "RESPONSIBILITY",
} as const;
export type LeadTargetType = (typeof LeadTargetType)[keyof typeof LeadTargetType];
export const LEAD_TARGET_TYPE_VALUES = Object.values(LeadTargetType);

export const LeadHolderType = {
  USER: "USER",
  ROLE: "ROLE",
} as const;
export type LeadHolderType = (typeof LeadHolderType)[keyof typeof LeadHolderType];
export const LEAD_HOLDER_TYPE_VALUES = Object.values(LeadHolderType);

export const LeadAssignmentStatus = {
  ACTIVE: "ACTIVE",
  REPLACED: "REPLACED",
  REMOVED: "REMOVED",
} as const;
export type LeadAssignmentStatus = (typeof LeadAssignmentStatus)[keyof typeof LeadAssignmentStatus];
export const LEAD_ASSIGNMENT_STATUS_VALUES = Object.values(LeadAssignmentStatus);
