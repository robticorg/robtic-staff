import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config, giftDeliveryRuntimeConfig } from "../../../config/index.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { ChannelConfigModel } from "../../configuration/models/channel-config.model.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { staffConfigService } from "../../configuration/services/staff-config.service.ts";
import { StaffConfigModel } from "../../configuration/models/staff-config.model.ts";
import { ChannelConfigType, RoleConfigType } from "../../configuration/types/enums.ts";
import { invalidateStaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { TicketModel } from "../../tickets/models/ticket.model.ts";
import { TicketStatus } from "../../tickets/types/enums.ts";
import { GiftClaimAuditModel } from "../models/gift-claim-audit.model.ts";
import { GiftClaimModel } from "../models/gift-claim.model.ts";
import { GiftDeliveryProofModel } from "../models/gift-delivery-proof.model.ts";
import { GiftDeliveryModel } from "../models/gift-delivery.model.ts";
import { attachGiftClaimClient } from "../runtime.ts";
import {
  TransferFailure,
  type StartTransferOptions,
  type TransferOutcome,
} from "../services/delivery/autoclaim.client.ts";
import { creditDeliveryService } from "../services/delivery/credit-delivery.service.ts";
import { giftCommandService } from "../services/delivery/gift-command.service.ts";
import { giftDeliveryRecoveryService } from "../services/delivery/gift-delivery-recovery.service.ts";
import { giftDeliveryService } from "../services/delivery/gift-delivery.service.ts";
import { giftClaimService } from "../services/gift-claim.service.ts";
import { giftDeliveryProofService } from "../services/delivery/gift-delivery-proof.service.ts";
import {
  GiftClaimSource,
  GiftClaimStatus,
  GiftDeliveryStatus,
  GiftDeliveryType,
  LinkDeliveryPath,
} from "../types/enums.ts";
import { FakeWorld, type FakeMember } from "./fake-discord.ts";

let hasDb = false;
try {
  await mongoose.connect(config.mongoUri, {
    dbName: `${config.mongoDbName}_test`,
    serverSelectionTimeoutMS: 1500,
  });
  hasDb = true;
} catch {
  hasDb = false;
}

const GUILD = "gift-delivery-itest";
const GM_ROLE = "gm-role";
const LADDER = ["gd-l0", "gd-l1"];
const DELIVERIES = "deliveries";
const DELIVERY_LOG = "delivery-log";
const ORDERS = "gift-orders";
const CATEGORY = "gift-cat";
const LINK = "https://discord.gift/SuperSecretCode123";
const E = giftDeliveryMessages.errors;

let world: FakeWorld;
let manager: FakeMember;
let staffMember: FakeMember;
let admin: FakeMember;
let winner: FakeMember;
let seq = 0;

interface TransferCall {
  options: Omit<StartTransferOptions, "sendMessage">;
  idempotencyKey: string;
}
let transferCalls: TransferCall[] = [];
let transferQueue: TransferOutcome["ok"][] = [];
let transferFailure: TransferFailure = TransferFailure.REJECTED;
let transferDelayMs = 0;

creditDeliveryService.useTransfer(async (options, context) => {
  const { sendMessage, ...rest } = options;
  transferCalls.push({ options: rest, idempotencyKey: context.idempotencyKey });
  const message = await sendMessage(context.announcement);
  if (transferDelayMs) await new Promise((r) => setTimeout(r, transferDelayMs));
  const ok = transferQueue.length ? transferQueue.shift()! : true;
  return ok ? { ok: true, messageId: message.id } : { ok: false, reason: transferFailure, messageId: message.id };
});
giftDeliveryProofService.useDownloader(async () => Buffer.from([1, 2, 3]));
const PROOF = [{ name: "proof.png", url: "https://cdn.example/proof.png", contentType: "image/png", size: 3 }];

async function claimFor(userId: string, overrides: Record<string, unknown> = {}) {
  return GiftClaimModel.create({
    guildId: GUILD,
    userId,
    rewardName: "Nitro",
    status: GiftClaimStatus.PENDING,
    proof: [{ url: "https://cdn.example/win.png", uploadedAt: new Date() }],
    ...overrides,
  });
}

function nextWinner(): FakeMember {
  seq += 1;
  return world.member(`winner-${seq}`);
}

async function approvedLink(user: FakeMember) {
  const claim = await claimFor(user.id);
  await giftDeliveryService.approveWithType({
    claimId: claim.claimId,
    manager: manager as never,
    type: GiftDeliveryType.LINK,
  });
  return claim;
}

const deliveryOf = (claimId: string) => GiftDeliveryModel.findOne({ claimId }).exec();
const claimOf = (claimId: string) => GiftClaimModel.findOne({ claimId }).exec();
const revealMessages = (userId: string) =>
  (world.dms.get(userId)?.sent ?? []).filter((m) => JSON.stringify(m.payload).includes("gc:reveal:"));
const dmTexts = (userId: string) =>
  (world.dms.get(userId)?.sent ?? []).map((m) => JSON.stringify(m.payload)).join(" ");
const deliveriesText = () =>
  JSON.stringify(
    [DELIVERIES, DELIVERY_LOG].flatMap((id) => world.channels.get(id)!.sent.map((m) => m.payload)),
  );

async function cleanup(): Promise<void> {
  await Promise.all([
    GiftClaimModel.deleteMany({ guildId: GUILD }),
    GiftDeliveryModel.deleteMany({ guildId: GUILD }),
    GiftDeliveryProofModel.deleteMany({ guildId: GUILD }),
    GiftClaimAuditModel.deleteMany({ guildId: GUILD }),
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffActivityModel.deleteMany({}),
    TicketModel.deleteMany({ guildId: GUILD }),
  ]);
}

describe.skipIf(!hasDb)("gift delivery (MongoDB + Discord fakes)", () => {
  beforeAll(async () => {
    await Promise.all([GiftDeliveryModel.syncIndexes(), GiftClaimModel.syncIndexes()]);
    await cleanup();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await roleConfigService.setRole({ guildId: GUILD, roleId: GM_ROLE, type: RoleConfigType.GIFT_MANAGER });
    await ChannelConfigModel.create([
      { guildId: GUILD, type: ChannelConfigType.GIFT_DELIVERIES, channelId: DELIVERIES },
      { guildId: GUILD, type: ChannelConfigType.GIFT_DELIVERY_LOG, channelId: DELIVERY_LOG },
      { guildId: GUILD, type: ChannelConfigType.GIFT_CLAIMS, channelId: ORDERS },
      { guildId: GUILD, type: ChannelConfigType.GIFT_DELIVERY_CATEGORY, channelId: CATEGORY },
    ]);
    invalidateStaffHierarchy(GUILD);
    giftDeliveryRuntimeConfig.giftLinkSecret = "itest-secret";
    await StaffConfigModel.deleteMany({ guildId: GUILD });
    await staffConfigService.setAutoclaimEnabled(GUILD, true);
  });

  afterAll(async () => {
    await cleanup();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
    await StaffConfigModel.deleteMany({ guildId: GUILD });
  });

  beforeEach(() => {
    world = new FakeWorld(GUILD, [CATEGORY], [GM_ROLE, ...LADDER]);
    world.textChannel(DELIVERIES);
    world.textChannel(DELIVERY_LOG);
    world.textChannel(ORDERS);
    attachGiftClaimClient(world.client);
    manager = world.member("manager", [GM_ROLE]);
    staffMember = world.member("staff", ["gd-l0"]);
    admin = world.member("admin", [], true);
    winner = nextWinner();
    transferCalls = [];
    transferQueue = [];
    transferFailure = TransferFailure.REJECTED;
    transferDelayMs = 0;
  });

  describe("CREDITS", () => {
    it("approves and transfers with no proof, then fulfills — autoclaim is the record", async () => {
      const claim = await claimFor(winner.id);
      const outcome = await giftDeliveryService.approveWithType({
        claimId: claim.claimId,
        manager: manager as never,
        type: GiftDeliveryType.CREDITS,
        amount: "500,000", });

      expect(outcome.kind).toBe("CREDITS");
      expect(transferCalls).toHaveLength(1);
      expect(transferCalls[0]!.options).toEqual({ userId: winner.id, guildId: GUILD, channelId: DELIVERIES, amount: "500000" });
      expect((await deliveryOf(claim.claimId))!.proof).toHaveLength(0);
      expect(world.channels.get(DELIVERIES)!.sent).toHaveLength(0);
      expect(world.channels.get(DELIVERY_LOG)!.sent.at(-1)!.payload.files ?? []).toHaveLength(0);
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.FULFILLED);
      const delivery = await deliveryOf(claim.claimId);
      expect(delivery!.status).toBe(GiftDeliveryStatus.FULFILLED);
      expect(delivery!.deliveredBy).toBe(manager.id);
    });

    it("keeps a failed transfer approved and retryable, then retries with the same key", async () => {
      const claim = await claimFor(winner.id);
      transferQueue = [false];
      const outcome = await giftDeliveryService.approveWithType({
        claimId: claim.claimId,
        manager: manager as never,
        type: GiftDeliveryType.CREDITS,
        amount: "1000", });
      expect(outcome.kind === "CREDITS" && outcome.result.ok).toBe(false);
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.APPROVED);
      const failed = await deliveryOf(claim.claimId);
      expect(failed!.status).toBe(GiftDeliveryStatus.FAILED);
      expect(failed!.error).toBe(TransferFailure.REJECTED);
      expect(dmTexts(winner.id)).not.toContain("كريدت لحسابك");

      const retry = await giftDeliveryService.deliverCredits(claim.claimId, manager as never);
      expect(retry.ok).toBe(true);
      expect(transferCalls).toHaveLength(2);
      expect(transferCalls[0]!.idempotencyKey).toBe(transferCalls[1]!.idempotencyKey);
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.FULFILLED);

      await expect(giftDeliveryService.deliverCredits(claim.claimId, manager as never)).rejects.toThrow(E.alreadyDelivered);
      expect(transferCalls).toHaveLength(2);
    });

    it("records a timeout as a retryable failure", async () => {
      const claim = await claimFor(winner.id);
      transferQueue = [false];
      transferFailure = TransferFailure.TIMEOUT;
      await giftDeliveryService.approveWithType({
        claimId: claim.claimId,
        manager: manager as never,
        type: GiftDeliveryType.CREDITS,
        amount: "10", });
      expect((await deliveryOf(claim.claimId))!.error).toBe(TransferFailure.TIMEOUT);
    });

    it("never transfers twice on a double approve or a double retry", async () => {
      const claim = await claimFor(winner.id);
      transferDelayMs = 30;
      const approvals = await Promise.allSettled([
        giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.CREDITS, amount: "5" }),
        giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.CREDITS, amount: "5" }),
      ]);
      expect(approvals.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(transferCalls).toHaveLength(1);

      const second = await claimFor(winner.id);
      transferQueue = [false];
      await giftDeliveryService.approveWithType({ claimId: second.claimId, manager: manager as never, type: GiftDeliveryType.CREDITS, amount: "5" });
      const retries = await Promise.allSettled([
        giftDeliveryService.deliverCredits(second.claimId, manager as never),
        giftDeliveryService.deliverCredits(second.claimId, manager as never),
      ]);
      expect(retries.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(transferCalls).toHaveLength(3);
    });

    it("refuses an invalid amount or a missing Deliveries Channel before approving", async () => {
      const claim = await claimFor(winner.id);
      await expect(
        giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.CREDITS, amount: "Nitro" }),
      ).rejects.toThrow(E.amountInvalid);

      world.channels.delete(DELIVERIES);
      await expect(
        giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.CREDITS, amount: "5" }),
      ).rejects.toThrow(E.deliveriesChannelMissing);
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.PENDING);
      expect(transferCalls).toHaveLength(0);
    });

    it("is closed by default and never calls the API while closed", async () => {
      await StaffConfigModel.deleteMany({ guildId: GUILD });
      try {
        expect(await staffConfigService.isAutoclaimEnabled(GUILD)).toBe(false);

        const claim = await claimFor(winner.id);
        await expect(
          giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.CREDITS, amount: "5" }),
        ).rejects.toThrow(E.autoclaimOff);
        expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.PENDING);

        await expect(
          giftDeliveryService.createCommandClaim({ staff: staffMember as never, userId: winner.id, ticketId: "t", originChannelId: "t-ch", rewardName: "x", type: GiftDeliveryType.CREDITS, amount: "5" }),
        ).rejects.toThrow(E.autoclaimOff);
        expect(await GiftClaimModel.countDocuments({ userId: winner.id })).toBe(1);

        await staffConfigService.setAutoclaimEnabled(GUILD, true);
        transferQueue = [false];
        await giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.CREDITS, amount: "5" });
        await staffConfigService.setAutoclaimEnabled(GUILD, false);
        await expect(giftDeliveryService.deliverCredits(claim.claimId, manager as never)).rejects.toThrow(E.autoclaimOff);
        expect(transferCalls).toHaveLength(1);
        expect((await deliveryOf(claim.claimId))!.status).toBe(GiftDeliveryStatus.FAILED);

        const other = await claimFor(winner.id);
        await giftDeliveryService.approveWithType({ claimId: other.claimId, manager: manager as never, type: GiftDeliveryType.OTHER });
        expect((await claimOf(other.claimId))!.status).toBe(GiftClaimStatus.APPROVED);
      } finally {
        await staffConfigService.setAutoclaimEnabled(GUILD, true);
      }
    });

    it("marks a transfer interrupted by a restart as retryable", async () => {
      const claim = await claimFor(winner.id);
      await GiftDeliveryModel.create({
        guildId: GUILD,
        claimId: claim.claimId,
        userId: winner.id,
        type: GiftDeliveryType.CREDITS,
        status: GiftDeliveryStatus.PROCESSING,
        amount: "5",
        lastAttemptAt: new Date(Date.now() - 60_000),
      });
      await giftDeliveryRecoveryService.reconcileOnStartup();
      const delivery = await deliveryOf(claim.claimId);
      expect(delivery!.status).toBe(GiftDeliveryStatus.FAILED);
      expect(delivery!.error).toBe("INTERRUPTED");
    });
  });

  describe("LINK", () => {
    it("DMs a reveal button, stores the link encrypted, and leaks it nowhere", async () => {
      const claim = await approvedLink(winner);
      const result = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: "حساب: Ahmed", proof: PROOF });

      expect(result.location.deliveryPath).toBe(LinkDeliveryPath.DM);
      const dm = world.dms.get(winner.id)!;
      const dmText = JSON.stringify(dm.sent.map((m) => m.payload));
      expect(dmText).toContain(`gc:reveal:${result.delivery.deliveryId}`);
      expect(dmText).not.toContain("SuperSecretCode123");
      expect(deliveriesText()).not.toContain("SuperSecretCode123");

      const plain = await GiftDeliveryModel.findOne({ claimId: claim.claimId }).exec();
      expect(plain!.secret).toBeUndefined();
      const raw = await GiftDeliveryModel.findOne({ claimId: claim.claimId }).select("+secret").exec();
      expect(raw!.secret).toBeDefined();
      expect(raw!.secret).not.toContain("SuperSecretCode123");
      expect(raw!.status).toBe(GiftDeliveryStatus.READY);
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.APPROVED);
    });

    it("reveals only to the owner, exactly once", async () => {
      const claim = await approvedLink(winner);
      const { delivery } = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });

      for (const other of [world.member("random"), staffMember, manager, admin]) {
        await expect(giftDeliveryService.reveal(delivery.deliveryId, other.id)).rejects.toThrow(E.notOwner);
      }
      expect((await deliveryOf(claim.claimId))!.status).toBe(GiftDeliveryStatus.READY);

      const results = await Promise.allSettled([
        giftDeliveryService.reveal(delivery.deliveryId, winner.id),
        giftDeliveryService.reveal(delivery.deliveryId, winner.id),
      ]);
      const revealed = results.filter((r) => r.status === "fulfilled");
      expect(revealed).toHaveLength(1);
      expect((revealed[0] as PromiseFulfilledResult<{ link: string }>).value.link).toBe(LINK);
      expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.message).toBe(E.alreadyClaimed);

      const after = await deliveryOf(claim.claimId);
      expect(after!.status).toBe(GiftDeliveryStatus.CLAIMED);
      expect(after!.claimedBy).toBe(winner.id);
      expect(after!.claimedAt).toBeInstanceOf(Date);
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.FULFILLED);
      expect(revealMessages(winner.id)[0]!.edits.length).toBeGreaterThan(0);
    });

    it("stores the proof without posting it where the link could leak", async () => {
      const claim = await approvedLink(winner);
      await expect(
        giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: [] }),
      ).rejects.toThrow(E.proofRequired);
      await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });
      expect((await deliveryOf(claim.claimId))!.proof).toHaveLength(1);
      expect(world.channels.get(DELIVERY_LOG)!.sent.every((m) => !m.payload.files?.length)).toBe(true);
    });

    it("refuses an invalid link without changing anything", async () => {
      const claim = await approvedLink(winner);
      await expect(
        giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: "discord.gift/abc", info: null, proof: PROOF }),
      ).rejects.toThrow(E.linkInvalid);
      expect((await deliveryOf(claim.claimId))!.status).toBe(GiftDeliveryStatus.PENDING);
    });

    it("falls back to a private channel when DMs are closed, still owner-only", async () => {
      world.closedDms.add(winner.id);
      const claim = await approvedLink(winner);
      const result = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });

      expect(result.location.deliveryPath).toBe(LinkDeliveryPath.CHANNEL);
      const channel = world.channels.get(result.location.deliveryChannelId)!;
      expect(channel.parentId).toBe(CATEGORY);
      const ids = channel.overwrites.map((o: { id: string }) => o.id);
      expect(ids).toContain(winner.id);
      expect(ids).toContain(GM_ROLE);
      expect(channel.overwrites.find((o: { id: string }) => o.id === GUILD).deny).toBeDefined();
      expect(JSON.stringify(channel.sent[0]!.payload)).toContain(`<@${winner.id}>`);

      await expect(giftDeliveryService.reveal(result.delivery.deliveryId, admin.id)).rejects.toThrow(E.notOwner);
      expect((await giftDeliveryService.reveal(result.delivery.deliveryId, winner.id)).link).toBe(LINK);
    });

    it("fails retryably when DMs are closed and no category is set", async () => {
      world.closedDms.add(winner.id);
      await ChannelConfigModel.deleteMany({ guildId: GUILD, type: ChannelConfigType.GIFT_DELIVERY_CATEGORY });
      try {
        const claim = await approvedLink(winner);
        await expect(
          giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF }),
        ).rejects.toThrow(E.deliveryCategoryMissing);
        expect((await deliveryOf(claim.claimId))!.status).toBe(GiftDeliveryStatus.FAILED);

        world.closedDms.delete(winner.id);
        const retry = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });
        expect(retry.location.deliveryPath).toBe(LinkDeliveryPath.DM);
      } finally {
        await ChannelConfigModel.create({ guildId: GUILD, type: ChannelConfigType.GIFT_DELIVERY_CATEGORY, channelId: CATEGORY });
      }
    });

    it("restores a deleted delivery message on the same record", async () => {
      const claim = await approvedLink(winner);
      const { delivery, location } = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });
      await world.dms.get(winner.id)!.store.get(location.deliveryMessageId)!.delete();

      await giftDeliveryRecoveryService.onMessageDeleted(location.deliveryMessageId);
      const after = await deliveryOf(claim.claimId);
      expect(after!.deliveryId).toBe(delivery.deliveryId);
      expect(after!.deliveryMessageId).not.toBe(location.deliveryMessageId);
      expect(revealMessages(winner.id)).toHaveLength(1);
      expect(await GiftDeliveryModel.countDocuments({ claimId: claim.claimId })).toBe(1);
      expect(await GiftClaimModel.countDocuments({ userId: winner.id })).toBe(1);
    });

    it("recreates a deleted private channel with the same permissions", async () => {
      world.closedDms.add(winner.id);
      const claim = await approvedLink(winner);
      const { location } = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });
      await world.channels.get(location.deliveryChannelId)!.delete();

      await giftDeliveryRecoveryService.onChannelDeleted(location.deliveryChannelId);
      const after = await deliveryOf(claim.claimId);
      expect(after!.deliveryChannelId).not.toBe(location.deliveryChannelId);
      const channel = world.channels.get(after!.deliveryChannelId!)!;
      expect(channel.parentId).toBe(CATEGORY);
      expect(channel.overwrites.map((o: { id: string }) => o.id)).toContain(winner.id);
      expect((await giftDeliveryService.reveal(after!.deliveryId, winner.id)).link).toBe(LINK);
    });

    it("repairs unclaimed deliveries on restart and leaves claimed ones alone", async () => {
      const claim = await approvedLink(winner);
      const { location } = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });
      await world.dms.get(winner.id)!.store.get(location.deliveryMessageId)!.delete();

      await giftDeliveryRecoveryService.reconcileOnStartup();
      expect(revealMessages(winner.id)).toHaveLength(1);

      const other = nextWinner();
      const second = await approvedLink(other);
      const done = await giftDeliveryService.deliverLink({ claimId: second.claimId, actor: manager as never, link: LINK, info: null, proof: PROOF });
      await giftDeliveryService.reveal(done.delivery.deliveryId, other.id);
      await world.dms.get(other.id)!.store.get(done.location.deliveryMessageId)!.delete();

      await giftDeliveryRecoveryService.reconcileOnStartup();
      expect(revealMessages(other.id)).toHaveLength(0);
      await expect(giftDeliveryService.reveal(done.delivery.deliveryId, other.id)).rejects.toThrow(E.alreadyClaimed);
    });
  });

  describe("OTHER", () => {
    const proof = [{ name: "delivered.png", url: "https://cdn.example/d.png", contentType: "image/png", size: 3 }];

    it("requires proof, saves it, posts it to the Deliveries Channel and fulfills", async () => {
      const claim = await claimFor(winner.id);
      await giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.OTHER });

      await expect(
        giftDeliveryService.deliverOther({ claimId: claim.claimId, actor: manager as never, uploads: [], info: null }),
      ).rejects.toThrow(E.proofRequired);

      await giftDeliveryService.deliverOther({ claimId: claim.claimId, actor: manager as never, uploads: proof, info: "تم الشحن" });
      const delivery = await deliveryOf(claim.claimId);
      expect(delivery!.status).toBe(GiftDeliveryStatus.FULFILLED);
      expect(delivery!.additionalInfo).toBe("تم الشحن");
      expect(delivery!.deliveredBy).toBe(manager.id);
      expect(delivery!.proof).toHaveLength(1);
      expect(await GiftDeliveryProofModel.countDocuments({ deliveryId: delivery!.deliveryId })).toBe(1);
      const log = world.channels.get(DELIVERY_LOG)!.sent.at(-1)!.payload;
      expect(log.files).toHaveLength(1);
      expect(log.content).toContain("تم الشحن");
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.FULFILLED);

      await expect(
        giftDeliveryService.deliverOther({ claimId: claim.claimId, actor: manager as never, uploads: proof, info: null }),
      ).rejects.toThrow(E.alreadyDelivered);
    });

    it("accepts exactly one proof file", async () => {
      const claim = await claimFor(winner.id);
      await giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.OTHER });
      await expect(
        giftDeliveryService.deliverOther({ claimId: claim.claimId, actor: manager as never, uploads: [...proof, ...proof], info: null }),
      ).rejects.toThrow(E.proofTooMany);
      expect((await deliveryOf(claim.claimId))!.status).toBe(GiftDeliveryStatus.PENDING);
    });

    it("refuses someone who is not a Gift Manager on a panel claim", async () => {
      const claim = await claimFor(winner.id);
      await giftDeliveryService.approveWithType({ claimId: claim.claimId, manager: manager as never, type: GiftDeliveryType.OTHER });
      await expect(
        giftDeliveryService.deliverOther({ claimId: claim.claimId, actor: staffMember as never, uploads: proof, info: null }),
      ).rejects.toThrow();
    });
  });

  describe("!gift", () => {
    async function ticketChannel(): Promise<{ channelId: string; ticketId: string }> {
      seq += 1;
      const channelId = `ticket-ch-${seq}`;
      const ticketId = `ticket-gd-${seq}`;
      world.textChannel(channelId);
      await TicketModel.create({
        ticketId,
        guildId: GUILD,
        channelId,
        userId: winner.id,
        panelId: "support",
        status: TicketStatus.OPEN,
      });
      return { channelId, ticketId };
    }

    const sentText = (channelId: string) =>
      JSON.stringify(world.channels.get(channelId)!.sent.map((m) => m.payload));

    it("is staff only, and knows the ticket owner", async () => {
      const { channelId } = await ticketChannel();
      await expect(giftCommandService.context(world.member("member") as never, channelId)).rejects.toThrow(
        giftDeliveryMessages.command.notStaff,
      );
      expect((await giftCommandService.context(staffMember as never, "not-a-ticket")).ticket).toBeNull();
      expect((await giftCommandService.context(staffMember as never, channelId)).ticket?.ownerId).toBe(winner.id);
    });

    it("lets only the author finish, once, and replies the transfer in the ticket", async () => {
      const { channelId, ticketId } = await ticketChannel();
      const draft = await giftCommandService.start({
        staff: staffMember as never,
        channelId,
        route: { kind: "TICKET", userId: winner.id, ticketId },
        info: "500k",
      });

      await expect(giftCommandService.take(draft.draftId, manager as never)).rejects.toThrow(giftDeliveryMessages.command.notAuthor);
      const taken = await giftCommandService.take(draft.draftId, staffMember as never);
      await expect(giftCommandService.take(draft.draftId, staffMember as never)).rejects.toThrow(giftDeliveryMessages.command.expired);

      const claim = await giftDeliveryService.createCommandClaim({
        staff: staffMember as never,
        userId: taken.userId,
        ticketId: taken.ticketId,
        originChannelId: taken.channelId,
        rewardName: "Credits",
        type: GiftDeliveryType.CREDITS,
        amount: taken.info!,
      });
      expect(claim.source).toBe(GiftClaimSource.COMMAND);
      const result = await giftDeliveryService.deliverCredits(claim.claimId, staffMember as never);
      expect(result.ok).toBe(true);
      expect(transferCalls.at(-1)!.options.channelId).toBe(DELIVERIES);
      expect(transferCalls.at(-1)!.options.amount).toBe("500000");
      expect((await claimOf(claim.claimId))!.status).toBe(GiftClaimStatus.FULFILLED);
      expect(sentText(channelId)).toContain("500000");
      expect(world.channels.get(DELIVERIES)!.sent).toHaveLength(0);

      await expect(
        giftDeliveryService.createCommandClaim({ staff: staffMember as never, userId: winner.id, ticketId: taken.ticketId, originChannelId: channelId, rewardName: "x", type: GiftDeliveryType.CREDITS, amount: "lots" }),
      ).rejects.toThrow(E.amountInvalid);
    });

    it("refuses a draft outside a ticket unless the author is an administrator", async () => {
      const draft = await giftCommandService.start({
        staff: staffMember as never,
        channelId: "general",
        route: { kind: "DIRECT", userId: winner.id },
        info: null,
      });
      await expect(giftCommandService.take(draft.draftId, staffMember as never)).rejects.toThrow(
        giftDeliveryMessages.command.notInTicket,
      );
      const adminDraft = await giftCommandService.start({
        staff: admin as never,
        channelId: "general",
        route: { kind: "DIRECT", userId: winner.id },
        info: null,
      });
      expect((await giftCommandService.take(adminDraft.draftId, admin as never)).ticketId).toBeNull();
    });

    it("sends a staff request to the order channel, and the approval transfers it", async () => {
      world.textChannel("general");
      const { claimId, orderChannelId } = await giftCommandService.request({
        staff: staffMember as never,
        channelId: "general",
        userId: winner.id,
        info: "50m فعالية",
      });
      expect(orderChannelId).toBe(ORDERS);
      expect(world.channels.get(ORDERS)!.sent).toHaveLength(1);
      const request = await claimOf(claimId);
      expect(request!.status).toBe(GiftClaimStatus.PENDING);
      expect(request!.source).toBe(GiftClaimSource.REQUEST);
      expect(request!.requestedBy).toBe(staffMember.id);
      expect(request!.deliveryType).toBe(GiftDeliveryType.CREDITS);

      await giftDeliveryService.approveWithType({
        claimId,
        manager: manager as never,
        type: GiftDeliveryType.CREDITS,
        amount: "50m",
      });
      expect(transferCalls.at(-1)!.options.amount).toBe("50000000");
      expect((await claimOf(claimId))!.status).toBe(GiftClaimStatus.FULFILLED);
      expect(sentText("general")).toContain("50000000");
    });

    it("records the ticket on an order sent from inside a ticket", async () => {
      const { channelId, ticketId } = await ticketChannel();
      const { claimId } = await giftCommandService.request({
        staff: staffMember as never,
        channelId,
        userId: winner.id,
        ticketId,
        info: "1m",
      });
      const order = await claimOf(claimId);
      expect(order!.ticketId).toBe(ticketId);
      expect(order!.originChannelId).toBe(channelId);
      const card = sentText(ORDERS);
      expect(card).toContain(ticketId);
      expect(card).toContain(`https://discord.com/channels/${GUILD}/${channelId}`);
    });

    it("tells the requesting channel when a request is rejected", async () => {
      world.textChannel("general");
      const { claimId } = await giftCommandService.request({
        staff: staffMember as never,
        channelId: "general",
        userId: winner.id,
        info: null,
      });
      await giftClaimService.rejectClaim({ claimId, manager: manager as never, reason: "مو مستحق" });
      expect(sentText("general")).toContain("مو مستحق");
    });

    it("delivers a link from the command with the same owner-only reveal", async () => {
      const { channelId, ticketId } = await ticketChannel();
      const draft = await giftCommandService.start({
        staff: staffMember as never,
        channelId,
        route: { kind: "TICKET", userId: winner.id, ticketId },
        info: "Nitro",
      });
      const taken = await giftCommandService.take(draft.draftId, staffMember as never);
      const claim = await giftDeliveryService.createCommandClaim({
        staff: staffMember as never,
        userId: taken.userId,
        ticketId: taken.ticketId,
        originChannelId: taken.channelId,
        rewardName: taken.info!,
        type: GiftDeliveryType.LINK,
      });
      const { delivery } = await giftDeliveryService.deliverLink({ claimId: claim.claimId, actor: staffMember as never, link: LINK, info: null, proof: PROOF });

      await expect(giftDeliveryService.reveal(delivery.deliveryId, staffMember.id)).rejects.toThrow(E.notOwner);
      expect((await giftDeliveryService.reveal(delivery.deliveryId, winner.id)).link).toBe(LINK);
    });
  });
});
