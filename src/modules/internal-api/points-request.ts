import { internalApiLimits } from "../../data/internal-api/config.ts";
import { isSnowflake } from "../../libs/validation/index.ts";
import {
  STAFF_POINT_TRANSACTION_TYPE_VALUES,
  StaffPointTransactionType,
} from "../staff/types/enums.ts";

export interface PointsRequest {
  guildId: string;
  userId: string;
  amount: number;
  type: StaffPointTransactionType;
  reason: string;
  idempotencyKey: string | null;
}

export type PointsRequestResult =
  | { ok: true; value: PointsRequest }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parsePointsRequest(body: unknown): PointsRequestResult {
  const input = asRecord(body);
  if (!input) return { ok: false, error: "body must be a JSON object" };

  const { guildId, userId, amount, type, reason, idempotencyKey } = input;
  if (typeof guildId !== "string" || !isSnowflake(guildId)) {
    return { ok: false, error: "guildId must be a Discord id" };
  }
  if (typeof userId !== "string" || !isSnowflake(userId)) {
    return { ok: false, error: "userId must be a Discord id" };
  }
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount === 0 ||
    Math.abs(amount) > internalApiLimits.maxAbsoluteAmount
  ) {
    return { ok: false, error: "amount must be a non-zero integer within the allowed range" };
  }

  const resolvedType = type === undefined ? StaffPointTransactionType.OTHER : type;
  if (
    typeof resolvedType !== "string" ||
    !(STAFF_POINT_TRANSACTION_TYPE_VALUES as readonly string[]).includes(resolvedType)
  ) {
    return { ok: false, error: "type is not a known point transaction type" };
  }

  if (reason !== undefined && typeof reason !== "string") {
    return { ok: false, error: "reason must be a string" };
  }
  const resolvedReason =
    (typeof reason === "string" ? reason.trim() : "").slice(0, internalApiLimits.maxReasonLength) ||
    internalApiLimits.defaultReason;

  if (
    idempotencyKey !== undefined &&
    (typeof idempotencyKey !== "string" ||
      !idempotencyKey.trim() ||
      idempotencyKey.length > internalApiLimits.maxIdempotencyKeyLength)
  ) {
    return { ok: false, error: "idempotencyKey must be a non-empty string" };
  }

  return {
    ok: true,
    value: {
      guildId,
      userId,
      amount,
      type: resolvedType as StaffPointTransactionType,
      reason: resolvedReason,
      idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey.trim() : null,
    },
  };
}
