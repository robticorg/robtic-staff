import type { Types } from "mongoose";
import { staffMessages } from "../../../data/messages/staff.ts";
import {
  StaffActivityType,
  StaffPointTransactionType,
  staffActivityService,
  staffPointService,
  staffService,
} from "../../staff/index.ts";

export interface TicketClaimCreditDeps {
  points: Pick<typeof staffPointService, "add">;
  activity: Pick<typeof staffActivityService, "create">;
  staff: Pick<typeof staffService, "incrementCounters">;
}

const defaultDeps: TicketClaimCreditDeps = {
  points: staffPointService,
  activity: staffActivityService,
  staff: staffService,
};

export async function applyTicketClaimCredit(
  staffId: Types.ObjectId,
  ticketId: string,
  deps: TicketClaimCreditDeps = defaultDeps,
): Promise<{ pointAwarded: boolean }> {
  const award = await deps.points.add({
    staffId,
    amount: 1,
    type: StaffPointTransactionType.TICKET_CLAIM,
    referenceId: ticketId,
    reason: staffMessages.points.ticketClaimReason(ticketId),
  });

  if (!award.duplicate) {
    await deps.activity.create({
      staffId,
      type: StaffActivityType.TICKET_CLAIM,
      referenceId: ticketId,
      metadata: { ticketId },
    });
    await deps.staff.incrementCounters(staffId, { ticketsClaimed: 1 });
  }

  return { pointAwarded: !award.duplicate };
}
