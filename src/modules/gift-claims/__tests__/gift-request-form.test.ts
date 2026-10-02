import { describe, expect, it } from "bun:test";
import { GiftClaimCustomId } from "../handlers/component-ids.ts";
import { buildGiftRequestModal } from "../render/request-modal.ts";
import { cooldownEndsAt } from "../services/delivery/gift-command-cooldown.ts";
import { validateGiftRequest } from "../services/delivery/gift-command.service.ts";
import { GiftDeliveryType } from "../types/enums.ts";

type Json = { type: number; custom_id?: string; required?: boolean; component?: Json; components?: Json[] };
const flat = (n: Json): Json[] => [
  n,
  ...(n.component ? flat(n.component) : []),
  ...(n.components ?? []).flatMap(flat),
];
const FILE_UPLOAD = 19;

const fieldsOf = (type: GiftDeliveryType) => {
  const modal = buildGiftRequestModal(GiftClaimCustomId.cmdRequestModal("d1", type), type).toJSON() as unknown as Json;
  return flat(modal).filter((n) => n.custom_id && n.custom_id !== modal.custom_id);
};

describe("gift order forms", () => {
  it("asks credits for the amount and proof", () => {
    const fields = fieldsOf(GiftDeliveryType.CREDITS);
    expect(fields.map((f) => f.custom_id)).toEqual(["amount", "deliveryProof"]);
  });

  it("asks nitro/effects for the exact gift and proof", () => {
    expect(fieldsOf(GiftDeliveryType.LINK).map((f) => f.custom_id)).toEqual(["item", "deliveryProof"]);
  });

  it("asks other gifts for the gift, the member account and proof", () => {
    const fields = fieldsOf(GiftDeliveryType.OTHER);
    expect(fields.map((f) => f.custom_id)).toEqual(["item", "account", "deliveryProof"]);
    expect(fields.find((f) => f.custom_id === "account")?.required).toBe(false);
  });

  it("always requires the proof", () => {
    for (const type of [GiftDeliveryType.CREDITS, GiftDeliveryType.LINK, GiftDeliveryType.OTHER]) {
      const proof = fieldsOf(type).find((f) => f.type === FILE_UPLOAD);
      expect(proof?.required).toBe(true);
    }
  });
});

describe("gift order validation", () => {
  it("reads the credits amount in any format", () => {
    expect(validateGiftRequest({ type: GiftDeliveryType.CREDITS, amount: "5m", item: null, account: null }).amount).toBe(
      "5000000",
    );
    expect(() =>
      validateGiftRequest({ type: GiftDeliveryType.CREDITS, amount: "lots", item: null, account: null }),
    ).toThrow();
  });

  it("needs the exact gift for nitro and other, and keeps the account only for other", () => {
    expect(() => validateGiftRequest({ type: GiftDeliveryType.LINK, amount: null, item: " ", account: null })).toThrow();
    expect(
      validateGiftRequest({ type: GiftDeliveryType.LINK, amount: null, item: "Nitro", account: "x" }),
    ).toEqual({ type: GiftDeliveryType.LINK, amount: null, item: "Nitro", account: null });
    expect(
      validateGiftRequest({ type: GiftDeliveryType.OTHER, amount: null, item: "400 Robux", account: "rbx_user" }),
    ).toEqual({ type: GiftDeliveryType.OTHER, amount: null, item: "400 Robux", account: "rbx_user" });
  });
});

describe("!gift ticket cooldown", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const HALF_HOUR = 30 * 60_000;

  it("blocks for 30 minutes after the last gift in the ticket", () => {
    const last = new Date(now.getTime() - 10 * 60_000);
    expect(cooldownEndsAt(last, now, HALF_HOUR)?.toISOString()).toBe("2026-10-01T12:20:00.000Z");
  });

  it("is free when the last gift is older, or there is none", () => {
    expect(cooldownEndsAt(new Date(now.getTime() - HALF_HOUR), now, HALF_HOUR)).toBeNull();
    expect(cooldownEndsAt(null, now, HALF_HOUR)).toBeNull();
  });
});
