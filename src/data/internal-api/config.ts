export const internalApiLimits = {
  maxBodyBytes: 16 * 1024,
  maxAbsoluteAmount: 1000,
  maxReasonLength: 300,
  maxIdempotencyKeyLength: 100,
  defaultReason: "Internal API",
} as const;
