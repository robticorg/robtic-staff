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

export interface TicketClaimCreditDeps {
  points: Pick<typeof staffPointService, "add">;
  activity: Pick<typeof staffActivityService, "create">;
  staff: Pick<typeof staffService, "incrementCounters">;
  /** The guild's value for the claim (/points values); left out, the default applies. */
  pointValues?: Pick<typeof pointValuesService, "forStaff">;
}

const defaultDeps: TicketClaimCreditDeps = {
  points: staffPointService,
  activity: staffActivityService,
  staff: staffService,
  pointValues: pointValuesService,
};

export async function applyTicketClaimCredit(
  staffId: Types.ObjectId,
  ticketId: string,
  deps: TicketClaimCreditDeps = defaultDeps,
  /** The ticket's name for people (`support-1`), shown in the point reason. */
  label: string = ticketId,
): Promise<{ pointAwarded: boolean }> {
  const award = await deps.points.add({
    staffId,
    amount: deps.pointValues
      ? await deps.pointValues.forStaff(staffId, StaffPointTransactionType.TICKET_CLAIM)
      : DEFAULT_POINT_VALUES[StaffPointTransactionType.TICKET_CLAIM],
    type: StaffPointTransactionType.TICKET_CLAIM,
    referenceId: ticketId,
    reason: staffMessages.points.ticketClaimReason(label),
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
