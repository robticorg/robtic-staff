export const internalApiLimits = {
  maxBodyBytes: 16 * 1024,
  maxStaffCheckIds: 100,
  maxAbsoluteAmount: 1000,
  maxReasonLength: 300,
  maxIdempotencyKeyLength: 100,
  defaultReason: "Internal API",
  /** Wrong-token attempts allowed per IP inside the window before it gets 429s. */
  maxFailedAuth: 10,
  failedAuthWindowMs: 10 * 60_000,
} as const;
