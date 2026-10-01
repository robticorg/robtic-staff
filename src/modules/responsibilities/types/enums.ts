export const ResponsibilityCategory = {
  STAFF: "STAFF",
  TICKETS: "TICKETS",
  APPLICATIONS: "APPLICATIONS",
  MODERATION: "MODERATION",
  COMMUNITY: "COMMUNITY",
  EVENTS: "EVENTS",
  DEVELOPMENT: "DEVELOPMENT",
  OTHER: "OTHER",
} as const;
export type ResponsibilityCategory = (typeof ResponsibilityCategory)[keyof typeof ResponsibilityCategory];
export const RESPONSIBILITY_CATEGORY_VALUES = Object.values(ResponsibilityCategory);

export const ResponsibilityAssignmentStatus = {
  ACTIVE: "ACTIVE",
  REMOVED: "REMOVED",
  EXPIRED: "EXPIRED",
} as const;
export type ResponsibilityAssignmentStatus =
  (typeof ResponsibilityAssignmentStatus)[keyof typeof ResponsibilityAssignmentStatus];
export const RESPONSIBILITY_ASSIGNMENT_STATUS_VALUES = Object.values(ResponsibilityAssignmentStatus);
