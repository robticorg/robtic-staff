export const ErrorCategory = {
  VALIDATION: "VALIDATION",
  PERMISSION: "PERMISSION",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  CONFIGURATION: "CONFIGURATION",
  DATABASE: "DATABASE",
  DISCORD: "DISCORD",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

export const GENERIC_USER_MESSAGE = "Something went wrong. Please try again.";
