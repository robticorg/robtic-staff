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

/** Short names other bots send; the full type names (e.g. "TICKET_CLAIM", "USER_WARNING") work too. */
export const POINT_TYPE_ALIASES: Readonly<Record<string, StaffPointTransactionType>> = {
  ticket: StaffPointTransactionType.TICKET_CLAIM,
  msg: StaffPointTransactionType.MESSAGE,
  warning: StaffPointTransactionType.USER_WARNING,
  warn: StaffPointTransactionType.USER_WARNING,
  pub: StaffPointTransactionType.SPECIAL_POST,
  sub: StaffPointTransactionType.PRIVATE_CHANNEL_CREATE,
  "sub-delete": StaffPointTransactionType.PRIVATE_CHANNEL_DELETE,
  role: StaffPointTransactionType.SELLER_ROLE,
};

/** undefined → OTHER (no type given); an unknown value → null. */
export function resolvePointType(raw: unknown): StaffPointTransactionType | null {
  if (raw === undefined || raw === null || raw === "") return StaffPointTransactionType.OTHER;
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  const alias = POINT_TYPE_ALIASES[key.toLowerCase()];
  if (alias) return alias;
  const upper = key.toUpperCase();
  return (STAFF_POINT_TRANSACTION_TYPE_VALUES as readonly string[]).includes(upper)
    ? (upper as StaffPointTransactionType)
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parsePointsRequest(body: unknown): PointsRequestResult {
  const input = asRecord(body);
  if (!input) return { ok: false, error: "body must be a JSON object" };

  const { guildId, userId, type, reason, idempotencyKey } = input;
  // Discord ids must arrive as strings: as JSON numbers they're already corrupted
  // (they exceed 2^53), so a number is refused with a message saying why.
  const idProblem = (name: string, value: unknown): string | null => {
    if (typeof value === "number") return `${name} must be sent as a string, e.g. "${name}": "1234567890"`;
    if (typeof value !== "string" || !isSnowflake(value.trim())) return `${name} must be a Discord id (string)`;
    return null;
  };
  const guildProblem = idProblem("guildId", guildId);
  if (guildProblem) return { ok: false, error: guildProblem };
  const userProblem = idProblem("userId", userId);
  if (userProblem) return { ok: false, error: userProblem };

  // The amount may be a number or a numeric string ("5", "-2").
  const amount =
    typeof input.amount === "string" && /^-?\d+$/.test(input.amount.trim())
      ? Number(input.amount.trim())
      : input.amount;
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount === 0 ||
    Math.abs(amount) > internalApiLimits.maxAbsoluteAmount
  ) {
    return {
      ok: false,
      error: `amount must be a non-zero whole number between -${internalApiLimits.maxAbsoluteAmount} and ${internalApiLimits.maxAbsoluteAmount}`,
    };
  }

  const resolvedType = resolvePointType(type);
  if (!resolvedType) {
    return {
      ok: false,
      error: `type must be one of: ${Object.keys(POINT_TYPE_ALIASES).join(", ")} (or leave it out)`,
    };
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
      guildId: (guildId as string).trim(),
      userId: (userId as string).trim(),
      amount,
      type: resolvedType,
      reason: resolvedReason,
      idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey.trim() : null,
    },
  };
}
