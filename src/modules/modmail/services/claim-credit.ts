import type { Types } from "mongoose";
import { staffMessages } from "../../../data/messages/staff.ts";
import {
  StaffActivityType,
  StaffPointTransactionType,
  staffActivityService,
  staffPointService,
  staffService,
} from "../../staff/index.ts";

export interface ClaimCreditDeps {
  points: Pick<typeof staffPointService, "add">;
  activity: Pick<typeof staffActivityService, "create">;
  staff: Pick<typeof staffService, "incrementCounters">;
}

const defaultDeps: ClaimCreditDeps = {
  points: staffPointService,
  activity: staffActivityService,
  staff: staffService,
};

export async function applyClaimCredit(
  staffId: Types.ObjectId,
  caseId: string,
  deps: ClaimCreditDeps = defaultDeps,
): Promise<{ pointAwarded: boolean }> {
  const award = await deps.points.add({
    staffId,
    amount: 1,
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
