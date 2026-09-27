import type { Types } from "mongoose";
import { logger } from "../../shared/utils/logger.ts";
import { staffPointService, type AddPointsInput, type AddPointsResult } from "../staff/services/staff-point.service.ts";
import { staffService } from "../staff/services/staff.service.ts";
import { parsePointsRequest } from "./points-request.ts";

const log = logger.child("internal-api:points");

export interface PointsDeps {
  findStaff(guildId: string, userId: string): Promise<{ _id: Types.ObjectId } | null>;
  addPoints(input: AddPointsInput): Promise<Pick<AddPointsResult, "balance" | "duplicate">>;
}

const defaultDeps: PointsDeps = {
  findStaff: (guildId, userId) => staffService.get(userId, guildId),
  addPoints: (input) => staffPointService.add(input),
};

export interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
}

export async function handlePointsRequest(
  body: unknown,
  deps: PointsDeps = defaultDeps,
): Promise<ApiResponse> {
  const parsed = parsePointsRequest(body);
  if (!parsed.ok) return { status: 400, body: { success: false, error: parsed.error } };
  const request = parsed.value;

  try {
    const staff = await deps.findStaff(request.guildId, request.userId);
    if (!staff) return { status: 404, body: { success: false, error: "staff not found" } };

    const result = await deps.addPoints({
      staffId: staff._id,
      amount: request.amount,
      type: request.type,
      reason: request.reason,
      ...(request.idempotencyKey ? { referenceId: `api:${request.idempotencyKey}` } : {}),
    });

    return {
      status: 200,
      body: { success: true, duplicate: result.duplicate, balance: result.balance },
    };
  } catch (err) {
    log.error("internal points request failed", err);
    return { status: 500, body: { success: false, error: "internal error" } };
  }
}
