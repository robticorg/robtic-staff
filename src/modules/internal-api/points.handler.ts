import type { Types } from "mongoose";
import { logger } from "../../shared/utils/logger.ts";
import { staffPointService, type AddPointsInput, type AddPointsResult } from "../staff/services/staff-point.service.ts";
import { staffService } from "../staff/services/staff.service.ts";
import {
  staffBreakPointService,
  type AddBreakPointsInput,
  type AddBreakPointsResult,
} from "../staff/services/staff-break-point.service.ts";
import { StaffStatus } from "../staff/types/enums.ts";
import { parsePointsRequest } from "./points-request.ts";

const log = logger.child("internal-api:points");

/**
 * Fired, blacklisted or transferred members are no longer staff — their requests are ignored.
 * Staff on break still count, but their points go to break points (see below).
 */
const ACTIVE_STAFF_STATUSES: readonly string[] = [StaffStatus.ACTIVE, StaffStatus.BREAK];

export interface PointsDeps {
  findStaff(
    guildId: string,
    userId: string,
  ): Promise<{ _id: Types.ObjectId; status?: string } | null>;
  addPoints(input: AddPointsInput): Promise<Pick<AddPointsResult, "balance" | "duplicate">>;
  addBreakPoints(input: AddBreakPointsInput): Promise<AddBreakPointsResult>;
}

const defaultDeps: PointsDeps = {
  findStaff: (guildId, userId) => staffService.get(userId, guildId),
  addPoints: (input) => staffPointService.add(input),
  addBreakPoints: (input) => staffBreakPointService.add(input),
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
    // Not staff → nothing to do. Answer 200 so callers can send every user without special-casing.
    if (!staff || (staff.status && !ACTIVE_STAFF_STATUSES.includes(staff.status))) {
      return { status: 200, body: { success: true, ignored: true, reason: "not staff" } };
    }

    const referenceId = request.idempotencyKey ? `api:${request.idempotencyKey}` : undefined;

    // On break → recorded as break points only; never added to their real total.
    if (staff.status === StaffStatus.BREAK) {
      const result = await deps.addBreakPoints({
        staffId: staff._id,
        guildId: request.guildId,
        amount: request.amount,
        type: request.type,
        reason: request.reason,
        ...(referenceId ? { referenceId } : {}),
      });
      return {
        status: 200,
        body: {
          success: true,
          ignored: false,
          onBreak: true,
          duplicate: result.duplicate,
          breakPoints: result.breakPoints,
        },
      };
    }

    const result = await deps.addPoints({
      staffId: staff._id,
      amount: request.amount,
      type: request.type,
      reason: request.reason,
      ...(referenceId ? { referenceId } : {}),
    });

    return {
      status: 200,
      body: {
        success: true,
        ignored: false,
        onBreak: false,
        duplicate: result.duplicate,
        balance: result.balance,
      },
    };
  } catch (err) {
    log.error("internal points request failed", err);
    return { status: 500, body: { success: false, error: "internal error" } };
  }
}
