import { randomBytes } from "node:crypto";
import { Types } from "mongoose";

export function shortId(bytes = 9): string {
  return randomBytes(bytes).toString("base64url");
}

export function toObjectId(value: string | Types.ObjectId): Types.ObjectId {
  if (value instanceof Types.ObjectId) return value;
  if (Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  throw new Error(`Invalid ObjectId: "${value}"`);
}
