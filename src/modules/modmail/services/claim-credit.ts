import type { Types } from "mongoose";
import { staffMessages } from "../../../data/messages/staff.ts";
import { DEFAULT_POINT_VALUES } from "../../staff/config/points.ts";
import {
  StaffActivityType,
  StaffPointTransactionType,
  staffActivityService,
  staffPointService,
  pointValuesService,
  staffService,
} from "../../staff/index.ts";

export interface ClaimCreditDeps {
  points: Pick<typeof staffPointService, "add">;
  activity: Pick<typeof staffActivityService, "create">;
  staff: Pick<typeof staffService, "incrementCounters">;
  /** The guild's value for the claim (/points values); left out, the default applies. */
  pointValues?: Pick<typeof pointValuesService, "forStaff">;
}

const defaultDeps: ClaimCreditDeps = {
  points: staffPointService,
  activity: staffActivityService,
  staff: staffService,
  pointValues: pointValuesService,
};

export async function applyClaimCredit(
  staffId: Types.ObjectId,
  caseId: string,
  deps: ClaimCreditDeps = defaultDeps,
): Promise<{ pointAwarded: boolean }> {
  const award = await deps.points.add({
    staffId,
    amount: deps.pointValues
      ? await deps.pointValues.forStaff(staffId, StaffPointTransactionType.REPORT_CLAIM)
      : DEFAULT_POINT_VALUES[StaffPointTransactionType.REPORT_CLAIM],
    type: StaffPointTransactionType.REPORT_CLAIM,
    referenceId: caseId,
    reason: staffMessages.points.reportClaimReason(caseId),
  });

  if (!award.duplicate) {
    await deps.activity.create({
      staffId,
      type: StaffActivityType.REPORT_CLAIM,
      referenceId: caseId,
      metadata: { caseId },
    });
    await deps.staff.incrementCounters(staffId, { reportsClaimed: 1 });
  }

  return { pointAwarded: !award.duplicate };
}
