import { describe, expect, it } from "bun:test";
import { parseCreditAmount } from "../../../modules/gift-claims/services/delivery/gift-delivery-input.ts";
import { sendAmountText } from "../staff/send.ts";

const USER = "123456789012345678";

describe("!send amount", () => {
  it("reads the amount around the mention", () => {
    expect(parseCreditAmount(sendAmountText([`<@${USER}>`, "5m"]))).toBe("5000000");
    expect(parseCreditAmount(sendAmountText(["5m", `<@${USER}>`]))).toBe("5000000");
    expect(parseCreditAmount(sendAmountText([USER, "5", "مليون"]))).toBe("5000000");
    expect(parseCreditAmount(sendAmountText([`<@${USER}>`, "500k"]))).toBe("500000");
  });

  it("is empty when only the mention is given", () => {
    expect(sendAmountText([`<@${USER}>`])).toBe("");
  });
});
