import { describe, expect, it } from "bun:test";
import { deliveryAction } from "../render/case-card.ts";
import { buildGiftClaimSubmitModal } from "../render/modals.ts";
import { buildLinkDeliveryMessage } from "../render/delivery-components.ts";
import {
  TransferFailure,
  createAutoclaimTransfer,
  type StartTransferOptions,
} from "../services/delivery/autoclaim.client.ts";
import { parseCreditAmount, parseGiftLink } from "../services/delivery/gift-delivery-input.ts";
import { decryptGiftSecret, encryptGiftSecret } from "../services/delivery/gift-secret.ts";
import { checkProof } from "../services/delivery/gift-delivery-proof.service.ts";
import { buildAmountModal, buildGiftCommandMenu, buildLinkModal, buildProofModal } from "../render/delivery-components.ts";
import { GiftClaimStatus, GiftDeliveryStatus, GiftDeliveryType } from "../types/enums.ts";

describe("credit amount", () => {
  it("accepts whole positive numbers with separators and Arabic digits", () => {
    expect(parseCreditAmount("500000")).toBe("500000");
    expect(parseCreditAmount("500,000")).toBe("500000");
    expect(parseCreditAmount("٥٠٠٠")).toBe("5000");
    expect(parseCreditAmount("0007")).toBe("7");
  });

  it("never reads free text as an amount", () => {
    for (const raw of ["Nitro", "500k", "-5", "0", "1.5", "", null, "1".repeat(16)]) {
      expect(parseCreditAmount(raw as string | null)).toBeNull();
    }
  });
});

describe("gift link", () => {
  it("accepts https links", () => {
    expect(parseGiftLink(" https://discord.gift/AbCdEf123 ")).toBe("https://discord.gift/AbCdEf123");
    expect(parseGiftLink("https://discord.com/billing/promotions/xyz")).toBe(
      "https://discord.com/billing/promotions/xyz",
    );
  });

  it("rejects anything that is not a clean https URL", () => {
    for (const raw of ["discord.gift/abc", "http://discord.gift/abc", "https://", "https://a b", "javascript:alert(1)", "https://localhost/x", ""]) {
      expect(parseGiftLink(raw)).toBeNull();
    }
  });
});

describe("gift link encryption", () => {
  it("round-trips and never stores the plain link", () => {
    const sealed = encryptGiftSecret("https://discord.gift/SECRET", "key-1");
    expect(sealed).not.toContain("SECRET");
    expect(sealed).not.toContain("discord.gift");
    expect(decryptGiftSecret(sealed, "key-1")).toBe("https://discord.gift/SECRET");
  });

  it("refuses the wrong key or tampered data", () => {
    const sealed = encryptGiftSecret("https://discord.gift/SECRET", "key-1");
    expect(decryptGiftSecret(sealed, "key-2")).toBeNull();
    const parts = sealed.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(decryptGiftSecret(parts.join(":"), "key-1")).toBeNull();
  });
});

describe("autoclaim client", () => {
  const config = { autoclaimApiUrl: "https://autoclaim.test", autoclaimApiToken: "tok", autoclaimTimeoutMs: 50 };
  const sent: string[] = [];
  const options: StartTransferOptions = {
    userId: "u1",
    guildId: "g1",
    channelId: "deliveries",
    amount: "500000",
    sendMessage: async (content) => {
      sent.push(content);
      return { id: "msg-1" };
    },
  };
  const context = { idempotencyKey: "gift-d1", announcement: "جاري التحويل" };

  it("posts to /api/claim with the deliveries channel, amount and idempotency key", async () => {
    let request: { url: string; init: RequestInit } | null = null;
    const transfer = createAutoclaimTransfer(config, async (url, init) => {
      request = { url, init };
      return new Response("{}", { status: 200 });
    });

    expect(await transfer(options, context)).toEqual({ ok: true, messageId: "msg-1" });
    expect(request!.url).toBe("https://autoclaim.test/api/claim");
    expect(request!.init.method).toBe("POST");
    const headers = request!.init.headers as Record<string, string>;
    expect(headers["idempotency-key"]).toBe("gift-d1");
    expect(headers.authorization).toBe("Bearer tok");
    expect(JSON.parse(String(request!.init.body))).toEqual({
      userId: "u1",
      guildId: "g1",
      channelId: "deliveries",
      amount: "500000",
      messageId: "msg-1",
      idempotencyKey: "gift-d1",
    });
    expect(sent.at(-1)).toBe("جاري التحويل");
  });

  it("maps rejections, outages, timeouts and a missing configuration", async () => {
    const respond = (status: number) =>
      createAutoclaimTransfer(config, async () => new Response("{}", { status }));
    expect(await respond(400)(options, context)).toMatchObject({ ok: false, reason: TransferFailure.REJECTED });
    expect(await respond(503)(options, context)).toMatchObject({ ok: false, reason: TransferFailure.UNAVAILABLE });

    const timeout = createAutoclaimTransfer(config, async () => {
      const err = new Error("timed out");
      err.name = "TimeoutError";
      throw err;
    });
    expect(await timeout(options, context)).toMatchObject({ ok: false, reason: TransferFailure.TIMEOUT });

    const down = createAutoclaimTransfer(config, async () => {
      throw new TypeError("fetch failed");
    });
    expect(await down(options, context)).toMatchObject({ ok: false, reason: TransferFailure.UNAVAILABLE });

    const disabled = createAutoclaimTransfer({ ...config, autoclaimApiUrl: undefined });
    expect(await disabled(options, context)).toEqual({ ok: false, reason: TransferFailure.DISABLED });
  });
});

describe("claim card delivery button", () => {
  const approved = (type?: GiftDeliveryType) => ({ status: GiftClaimStatus.APPROVED, deliveryType: type });

  it("offers delivery for link, other and legacy claims, retry for credits", () => {
    expect(deliveryAction(approved(GiftDeliveryType.LINK), null)).toBe("DELIVER");
    expect(deliveryAction(approved(GiftDeliveryType.OTHER), null)).toBe("DELIVER");
    expect(deliveryAction(approved(), null)).toBe("DELIVER");
    expect(deliveryAction(approved(GiftDeliveryType.CREDITS), { status: GiftDeliveryStatus.FAILED })).toBe("RETRY");
  });

  it("offers nothing while delivering, once delivered, or before approval", () => {
    for (const status of [GiftDeliveryStatus.PROCESSING, GiftDeliveryStatus.READY, GiftDeliveryStatus.CLAIMED, GiftDeliveryStatus.FULFILLED]) {
      expect(deliveryAction(approved(GiftDeliveryType.LINK), { status })).toBeNull();
    }
    expect(deliveryAction({ status: GiftClaimStatus.PENDING, deliveryType: undefined }, null)).toBeNull();
  });
});

describe("gift claim modal", () => {
  it("asks the member for the reward type with a required select", () => {
    const json = buildGiftClaimSubmitModal().toJSON() as unknown as {
      components: { component: { custom_id: string; type: number; required?: boolean; options?: { value: string }[] } }[];
    };
    const select = json.components.map((c) => c.component).find((c) => c.custom_id === "deliveryType");
    expect(select?.type).toBe(3);
    expect(select?.required).toBe(true);
    expect(select?.options?.map((o) => o.value)).toEqual([
      GiftDeliveryType.CREDITS,
      GiftDeliveryType.LINK,
      GiftDeliveryType.OTHER,
    ]);
    expect(json.components.length).toBeLessThanOrEqual(5);
  });
});

describe("delivery inputs", () => {
  it("requires exactly one proof file under the size limit", () => {
    const file = { name: "p.png", url: "https://x", contentType: "image/png", size: 10 };
    expect(checkProof([])).toBe("MISSING");
    expect(checkProof([file])).toBeNull();
    expect(checkProof([file, file])).toBe("TOO_MANY");
    expect(checkProof([{ ...file, size: 100 * 1024 * 1024 }])).toBe("TOO_LARGE");
  });

  it("asks for one proof file in every delivery modal", () => {
    for (const modal of [buildAmountModal("a"), buildLinkModal("b"), buildProofModal("c")]) {
      const json = modal.toJSON() as unknown as {
        components: { component: { custom_id: string; min_values?: number; max_values?: number } }[];
      };
      const upload = json.components.map((c) => c.component).find((c) => c.custom_id === "deliveryProof");
      expect(upload?.min_values).toBe(1);
      expect(upload?.max_values).toBe(1);
    }
  });

  it("builds the !gift menu as a V2 section with a type select, no embed", () => {
    const menu = buildGiftCommandMenu({
      selectCustomId: "gc:ctype:d1",
      userId: "123",
      avatarUrl: "https://cdn.discordapp.com/avatars/123/a.png",
      info: null,
    });
    expect(menu.embeds).toBeUndefined();
    const [container] = (menu.components ?? []).map((c) => ("toJSON" in c ? c.toJSON() : c)) as {
      components: { type: number; accessory?: { type: number; media: { url: string } }; components?: { type: number; custom_id?: string; options?: { value: string; label: string }[] }[] }[];
    }[];
    const section = container!.components.find((c) => c.type === 9);
    expect(section?.accessory?.type).toBe(11);
    expect(section?.accessory?.media.url).toContain("avatars/123");
    const select = container!.components.flatMap((c) => c.components ?? []).find((c) => c.type === 3);
    expect(select?.custom_id).toBe("gc:ctype:d1");
    expect(select?.options?.map((o) => o.label)).toEqual(["كريدتس", "نيترو | إفكت", "أخرى"]);
  });

  it("puts only the delivery id in the reveal button", () => {
    const message = buildLinkDeliveryMessage({ revealCustomId: "gc:reveal:d1", claimed: false, channelNotice: null });
    const json = JSON.stringify(message.components?.map((c) => ("toJSON" in c ? c.toJSON() : c)));
    expect(json).toContain("gc:reveal:d1");
    expect(json).not.toContain("discord.gift");
  });
});
