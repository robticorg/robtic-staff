import { describe, expect, it, mock } from "bun:test";
import { Types } from "mongoose";
import { StaffPointTransactionType } from "../../staff/index.ts";
import { applyClaimCredit, type ClaimCreditDeps } from "../services/claim-credit.ts";

function makeDeps(duplicate: boolean) {
  const add = mock((_input: Record<string, unknown>) =>
    Promise.resolve({ transaction: null, balance: 1, duplicate }),
  );
  const create = mock((_input: Record<string, unknown>) => Promise.resolve({} as never));
  const incrementCounters = mock((_id: unknown, _deltas: Record<string, number>) =>
    Promise.resolve(null),
  );
  const deps = {
    points: { add },
    activity: { create },
    staff: { incrementCounters },
  } as unknown as ClaimCreditDeps;
  return { deps, add, create, incrementCounters };
}

describe("applyClaimCredit", () => {
  const staffId = new Types.ObjectId();

  it("awards exactly +1 point, one activity and one counter bump on first claim", async () => {
    const { deps, add, create, incrementCounters } = makeDeps(false);

    const result = await applyClaimCredit(staffId, "RPT-100", deps);

    expect(result.pointAwarded).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]![0]).toMatchObject({
      staffId,
      amount: 1,
      type: StaffPointTransactionType.REPORT_CLAIM,
      referenceId: "RPT-100",
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(incrementCounters).toHaveBeenCalledTimes(1);
    expect(incrementCounters.mock.calls[0]![1]).toEqual({ reportsClaimed: 1 });
  });

  it("does NOT create a second point / activity when the award is a duplicate", async () => {
    const { deps, add, create, incrementCounters } = makeDeps(true);

    const result = await applyClaimCredit(staffId, "RPT-100", deps);

    expect(result.pointAwarded).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(incrementCounters).not.toHaveBeenCalled();
  });
});
