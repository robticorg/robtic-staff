import { describe, expect, it, mock } from "bun:test";
import { Types } from "mongoose";
import { StaffActivityType, StaffPointTransactionType } from "../../staff/index.ts";
import { applyTicketClaimCredit, type TicketClaimCreditDeps } from "../services/ticket-claim-credit.ts";

function makeDeps(duplicate: boolean) {
  const add = mock((_input: Record<string, unknown>) =>
    Promise.resolve({ transaction: null, balance: 1, duplicate }),
  );
  const create = mock((_input: Record<string, unknown>) => Promise.resolve({} as never));
  const incrementCounters = mock((_id: unknown, _deltas: Record<string, number>) =>
    Promise.resolve(null),
  );
  return {
    deps: { points: { add }, activity: { create }, staff: { incrementCounters } } as unknown as TicketClaimCreditDeps,
    add,
    create,
    incrementCounters,
  };
}

describe("applyTicketClaimCredit", () => {
  const staffId = new Types.ObjectId();

  it("first claim → exactly +1 TICKET_CLAIM point, one activity, one counter bump", async () => {
    const { deps, add, create, incrementCounters } = makeDeps(false);
    const result = await applyTicketClaimCredit(staffId, "ticket-1", deps);

    expect(result.pointAwarded).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]![0]).toMatchObject({
      staffId,
      amount: 1,
      type: StaffPointTransactionType.TICKET_CLAIM,
      referenceId: "ticket-1",
    });
    expect(create.mock.calls[0]![0]).toMatchObject({
      type: StaffActivityType.TICKET_CLAIM,
      referenceId: "ticket-1",
    });
    expect(incrementCounters.mock.calls[0]![1]).toEqual({ ticketsClaimed: 1 });
  });

  it("duplicate claim → no second point / activity / counter", async () => {
    const { deps, add, create, incrementCounters } = makeDeps(true);
    const result = await applyTicketClaimCredit(staffId, "ticket-1", deps);

    expect(result.pointAwarded).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(incrementCounters).not.toHaveBeenCalled();
  });
});
