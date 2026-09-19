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

  it("credits the handover target under their own staffId, not the previous claimer's", async () => {
    const newClaimerId = new Types.ObjectId();
    const { deps, add } = makeDeps(false);

    await applyTicketClaimCredit(newClaimerId, "ticket-1", deps);

    // The unique index is staffId + type + referenceId, so the same ticket id
    // under a different staffId is a fresh award — that is what lets a handover
    // pay the new claimer without touching the original claimer's point.
    expect(add.mock.calls[0]![0]).toMatchObject({
      staffId: newClaimerId,
      referenceId: "ticket-1",
      type: StaffPointTransactionType.TICKET_CLAIM,
    });
    expect(add.mock.calls[0]![0]!.staffId).not.toBe(staffId);
  });
});

describe("handover credits the new claimer", () => {
  it("awards through the same helper a direct claim uses", async () => {
    const source = await Bun.file("src/modules/tickets/services/ticket.service.ts").text();

    const transfer = source.slice(
      source.indexOf("async transferTicket"),
      source.indexOf("private async applyTransferOverwrites"),
    );
    expect(transfer.length).toBeGreaterThan(0);
    expect(transfer).toContain("applyTicketClaimCredit(staff._id, ticketId)");
    expect(transfer).toContain("pointAwarded");
  });

  it("tells the actor whether a point was actually awarded", async () => {
    const flow = await Bun.file(
      "src/modules/tickets/services/ticket-transfer-flow.ts",
    ).text();

    expect(flow).toContain("result.pointAwarded");
    expect(flow).toContain("doneNoPoint");
  });
});
