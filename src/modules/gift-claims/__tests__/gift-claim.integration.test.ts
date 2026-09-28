import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { ChannelConfigModel } from "../../configuration/models/channel-config.model.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { GiftClaimAuditModel } from "../models/gift-claim-audit.model.ts";
import { GiftClaimModel } from "../models/gift-claim.model.ts";
import { GiftClaimStatus, GiftDeliveryType } from "../types/enums.ts";
import { attachGiftClaimClient } from "../runtime.ts";
import { giftClaimService } from "../services/gift-claim.service.ts";

const TEST_DB = `${config.mongoDbName}_test`;
async function ensureConnected(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(config.mongoUri, { dbName: TEST_DB, serverSelectionTimeoutMS: 1500 });
    return true;
  } catch {
    return false;
  }
}
const hasDb = await ensureConnected();

const GUILD = "gc-itest-guild";
const GIFT_ROLE = "gc-manager-role";
const GIFT_CHANNEL = "gc-review-channel";

const spy = { dms: 0, dmFiles: 0, channelSends: 0 };

const reviewChannel = {
  id: GIFT_CHANNEL,
  send: async () => {
    spy.channelSends += 1;
    return { id: `msg-${GIFT_CHANNEL}` };
  },
  messages: { fetch: async () => ({ edit: async () => undefined }) },
};

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

const GIFT_BLACKLIST_ROLE = "gc-gift-blacklist-role";

function claimant(id: string, roleIds: string[] = []) {
  const cache = new RoleCache();
  for (const roleId of roleIds) cache.set(roleId, { id: roleId });
  return { id, guild: { id: GUILD }, roles: { cache } } as never;
}

function manager(id: string, isAdmin = true) {
  return {
    id,
    guild: { id: GUILD },
    roles: { cache: new RoleCache() },
    permissions: { has: () => isAdmin },
  } as never;
}

async function openClaim(userId: string, rewardName = "Nitro شهر") {
  const { claim } = await giftClaimService.createFromModal({
    guildId: GUILD,
    member: claimant(userId),
    rewardName,
    proofUrl: "https://cdn.example/win.png",
  });
  return claim;
}

async function cleanup(): Promise<void> {
  await Promise.all([
    GiftClaimModel.deleteMany({ guildId: GUILD }),
    GiftClaimAuditModel.deleteMany({}),
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffActivityModel.deleteMany({}),
  ]);
  spy.dms = 0;
  spy.dmFiles = 0;
  spy.channelSends = 0;
}

describe.skipIf(!hasDb)("Gift Claim (self-service modal + review channel)", () => {
  beforeAll(async () => {
    await ensureConnected();
    await GiftClaimModel.syncIndexes();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
    await RoleConfigModel.create({
      guildId: GUILD,
      roleId: GIFT_ROLE,
      type: RoleConfigType.GIFT_MANAGER,
    });
    await ChannelConfigModel.create({
      guildId: GUILD,
      type: ChannelConfigType.GIFT_CLAIMS,
      channelId: GIFT_CHANNEL,
    });
    attachGiftClaimClient({
      users: {
        fetch: async (id: string) => ({
          id,
          createDM: async () => ({
            send: async (payload: { files?: unknown[] }) => {
              spy.dms += 1;
              if (payload?.files?.length) spy.dmFiles += 1;
            },
          }),
        }),
      },
      channels: { fetch: async (id: string) => (id === GIFT_CHANNEL ? reviewChannel : null) },
    } as never);
  });

  afterAll(async () => {
    await cleanup();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
  });

  beforeEach(async () => {
    await ensureConnected();
    await cleanup();
  });
  afterEach(cleanup);

  it("createFromModal: creates a PENDING claim with the win proof + card in the review channel + DM", async () => {
    const { claim } = await giftClaimService.createFromModal({
      guildId: GUILD,
      member: claimant("winner-1"),
      rewardName: "Discord Nitro لمدة شهر",
      prize: "من قيف أوي الأحد",
      proofUrl: "https://cdn.example/win-1.png",
    });

    expect(claim.status).toBe(GiftClaimStatus.PENDING);
    expect(claim.rewardName).toBe("Discord Nitro لمدة شهر");
    expect(claim.prize).toBe("من قيف أوي الأحد");
    expect(claim.proof.map((p) => p.url)).toEqual(["https://cdn.example/win-1.png"]);
    expect(claim.channelId).toBe(GIFT_CHANNEL);
    expect(claim.messageId).toBe(`msg-${GIFT_CHANNEL}`);

    const audits = await GiftClaimAuditModel.find({ claimId: claim.claimId }).exec();
    expect(audits.map((a) => a.action)).toContain("GIFT_CLAIM_CREATED");
    expect(spy.dms).toBe(1);
  });

  it("createFromModal: keeps the reward type the member picked", async () => {
    const { claim } = await giftClaimService.createFromModal({
      guildId: GUILD,
      member: claimant("winner-type"),
      rewardName: "Nitro",
      proofUrl: "https://cdn.example/win-type.png",
      deliveryType: GiftDeliveryType.LINK,
    });
    expect(claim.deliveryType).toBe(GiftDeliveryType.LINK);
    expect((await GiftClaimModel.findOne({ claimId: claim.claimId }).exec())!.deliveryType).toBe(
      GiftDeliveryType.LINK,
    );
  });

  it("createFromModal: refused when the GIFT_CLAIMS channel is not configured", async () => {
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
    await expect(
      giftClaimService.createFromModal({
        guildId: GUILD,
        member: claimant("winner-x"),
        rewardName: "Nitro",
        proofUrl: "https://cdn.example/x.png",
      }),
    ).rejects.toThrow();
    await ChannelConfigModel.create({
      guildId: GUILD,
      type: ChannelConfigType.GIFT_CLAIMS,
      channelId: GIFT_CHANNEL,
    });
  });

  it("canCreate: open claims never block, only the gift blacklist does", async () => {
    await openClaim("winner-2");
    expect((await giftClaimService.canCreate(claimant("winner-2"))).ok).toBe(true);

    await RoleConfigModel.create({
      guildId: GUILD,
      roleId: GIFT_BLACKLIST_ROLE,
      type: RoleConfigType.GIFT_BLACKLIST,
    });
    try {
      expect(
        (await giftClaimService.canCreate(claimant("winner-2", [GIFT_BLACKLIST_ROLE]))).ok,
      ).toBe(false);
      expect((await giftClaimService.canCreate(claimant("winner-2"))).ok).toBe(true);
    } finally {
      await RoleConfigModel.deleteMany({ guildId: GUILD, type: RoleConfigType.GIFT_BLACKLIST });
    }
  });

  it("approve → APPROVED + reviewedBy + activity; unauthorized refused; double approve → one wins", async () => {
    const claim = await openClaim("winner-3");

    await expect(
      giftClaimService.approveClaim({ claimId: claim.claimId, manager: manager("rando", false) }),
    ).rejects.toThrow();

    const gm = manager("gm-b");
    const results = await Promise.allSettled([
      giftClaimService.approveClaim({ claimId: claim.claimId, manager: gm }),
      giftClaimService.approveClaim({ claimId: claim.claimId, manager: gm }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const stored = await GiftClaimModel.findOne({ claimId: claim.claimId }).exec();
    expect(stored?.status).toBe(GiftClaimStatus.APPROVED);
    expect(stored?.reviewedBy).toBe("gm-b");
    const acts = await StaffActivityModel.find({ referenceId: claim.claimId }).exec();
    expect(acts.map((a) => a.type)).toContain("GIFT_CLAIM_APPROVE");
  });

  it("reject → REJECTED + reason; win proof preserved; empty reason refused; double reject → one wins", async () => {
    const claim = await openClaim("winner-4");
    await expect(
      giftClaimService.rejectClaim({ claimId: claim.claimId, manager: manager("gm-c"), reason: "  " }),
    ).rejects.toThrow();

    const gm = manager("gm-c");
    const results = await Promise.allSettled([
      giftClaimService.rejectClaim({ claimId: claim.claimId, manager: gm, reason: "Fake screenshot" }),
      giftClaimService.rejectClaim({ claimId: claim.claimId, manager: gm, reason: "again" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const stored = await GiftClaimModel.findOne({ claimId: claim.claimId }).exec();
    expect(stored?.status).toBe(GiftClaimStatus.REJECTED);
    expect(stored?.rejectionReason).toBeOneOf(["Fake screenshot", "again"]);
    expect(stored?.proof).toHaveLength(1);
  });

  it("persists across a fresh read (restart-safe)", async () => {
    const claim = await openClaim("winner-6", "Steam Gift");
    await giftClaimService.approveClaim({ claimId: claim.claimId, manager: manager("gm-g") });

    const fresh = await GiftClaimModel.findOne({ claimId: claim.claimId }).exec();
    expect(fresh?.status).toBe(GiftClaimStatus.APPROVED);
    expect(fresh?.rewardName).toBe("Steam Gift");
    expect(fresh?.proof[0]?.url).toBe("https://cdn.example/win.png");
  });
});
