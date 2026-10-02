import { describe, expect, it } from "bun:test";
import { parseCreditAmount } from "../../../modules/gift-claims/services/delivery/gift-delivery-input.ts";
import { parseSendArgs } from "../staff/send.ts";

const USER = "123456789012345678";
const amountOf = (args: string[]) => parseCreditAmount(parseSendArgs(args).amountText);

describe("!send", () => {
  it("reads the amount around the mention", () => {
    expect(amountOf([`<@${USER}>`, "5m"])).toBe("5000000");
    expect(amountOf(["5m", `<@${USER}>`])).toBe("5000000");
    expect(amountOf([USER, "5", "مليون"])).toBe("5000000");
    expect(amountOf([`<@${USER}>`, "500k"])).toBe("500000");
  });

  it("transfers in the current channel unless the gift keyword is given", () => {
    expect(parseSendArgs([`<@${USER}>`, "5m"]).toDeliveryChannel).toBe(false);
    expect(parseSendArgs([`<@${USER}>`, "5m", "gift"])).toEqual({ amountText: "5m", toDeliveryChannel: true });
    expect(parseSendArgs([`<@${USER}>`, "GIFT", "5m"]).toDeliveryChannel).toBe(true);
    expect(parseSendArgs([`<@${USER}>`, "5m", "هدية"]).toDeliveryChannel).toBe(true);
  });

  it("is empty when only the mention is given", () => {
    expect(parseSendArgs([`<@${USER}>`]).amountText).toBe("");
  });
});
