import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { PermissionFlagsBits, type Guild } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { claimReleaseConfig } from "../../../data/tickets/claim-release.ts";
import { StaffTagRestrictionModel } from "../../server-tag/models/staff-tag-restriction.model.ts";
import { StaffTagRestrictionKind } from "../../server-tag/types/enums.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffOffDutyReason, type StaffOffDutyEvent } from "../../staff/services/staff-duty-events.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { TicketClaimCheckModel, TicketClaimCheckStatus } from "../models/ticket-claim-check.model.ts";
import { decideClaimRelease } from "../services/claim-release-decision.ts";
import { TicketClaimCheckService } from "../services/ticket-claim-check.service.ts";

const DAY = 24 * 60 * 60_000;
const now = new Date("2026-10-04T12:00:00Z");
const facts = (over: Partial<Parameters<typeof decideClaimRelease>[0]> = {}) =>
  decideClaimRelease({
    isAdministrator: false,
    staffStatus: StaffStatus.FIRED,
    tagRemovedAt: null,
    now,
    tagGraceMs: 3 * DAY,
    ...over,
  });

describe("claim release decision", () => {
  it("never releases an administrator", () => {
    expect(facts({ isAdministrator: true })).toEqual({ action: "KEEP", why: "ADMIN" });
  });

  it("keeps the claim when the member is staff again", () => {
    expect(facts({ staffStatus: StaffStatus.ACTIVE })).toEqual({ action: "KEEP", why: "STILL_STAFF" });
  });

  it("releases when they are still fired, on break, or have no staff record", () => {
    for (const status of [StaffStatus.FIRED, StaffStatus.BLACKLISTED, StaffStatus.BREAK, null]) {
      expect(facts({ staffStatus: status })).toEqual({ action: "RELEASE" });
    }
  });

  it("waits until 3 days after the tag was removed", () => {
    const tagRemovedAt = new Date(now.getTime() - DAY);
    expect(facts({ tagRemovedAt })).toEqual({ action: "WAIT", until: new Date(tagRemovedAt.getTime() + 3 * DAY) });
    expect(facts({ tagRemovedAt: new Date(now.getTime() - 3 * DAY) })).toEqual({ action: "RELEASE" });
  });

  it("uses a 15 minute check delay and a 3 day tag grace", () => {
    expect(claimReleaseConfig.checkDelayMs).toBe(15 * 60_000);
    expect(claimReleaseConfig.tagGraceMs).toBe(3 * DAY);
  });
});

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

const GUILD = "claim-check-itest-guild";

function guildWith(members: Record<string, boolean>): Guild {
  return {
    id: GUILD,
    members: {
      fetch: async (id: string) => {
        if (!(id in members)) throw new Error("unknown member");
        const admin = members[id]!;
        return { id, permissions: { has: (f: bigint) => admin && f === PermissionFlagsBits.Administrator } };
      },
    },
  } as unknown as Guild;
}

describe.skipIf(!hasDb)("claim checks (MongoDB)", () => {
  const released: StaffOffDutyEvent[] = [];
  const service = new TicketClaimCheckService();
  service.useRelease({
    release: async (_guild, event) => {
      released.push(event);
      return 1;
    },
  });

  const event = (userId: string): StaffOffDutyEvent => ({
    guildId: GUILD,
    userId,
    actorId: "admin",
    reason: StaffOffDutyReason.FIRED,
  });
  const checkOf = (userId: string) => TicketClaimCheckModel.findOne({ guildId: GUILD, userId }).sort({ createdAt: -1 }).exec();

  beforeEach(async () => {
    released.length = 0;
    await Promise.all([
      TicketClaimCheckModel.deleteMany({ guildId: GUILD }),
      StaffModel.deleteMany({ guildId: GUILD }),
      StaffTagRestrictionModel.deleteMany({ guildId: GUILD }),
    ]);
  });

  afterAll(async () => {
    if (!hasDb) return;
    await Promise.all([
      TicketClaimCheckModel.deleteMany({ guildId: GUILD }),
      StaffModel.deleteMany({ guildId: GUILD }),
      StaffTagRestrictionModel.deleteMany({ guildId: GUILD }),
    ]);
    await mongoose.disconnect();
  });

  it("schedules one check 15 minutes later, and a repeat event moves it", async () => {
    await service.schedule(event("s1"), now);
    await service.schedule(event("s1"), new Date(now.getTime() + 60_000));
    const checks = await TicketClaimCheckModel.find({ guildId: GUILD, userId: "s1" }).exec();
    expect(checks).toHaveLength(1);
    expect(checks[0]!.dueAt.getTime()).toBe(now.getTime() + 60_000 + 15 * 60_000);
  });

  it("releases only if they are still not staff when the check runs", async () => {
    await StaffModel.create([
      { guildId: GUILD, userId: "fired", status: StaffStatus.FIRED, currentRoleLevel: 0 },
      { guildId: GUILD, userId: "back", status: StaffStatus.ACTIVE, currentRoleLevel: 2 },
    ]);
    const guild = guildWith({ fired: false, back: false });
    for (const id of ["fired", "back"]) {
      await service.schedule(event(id), now);
      await service.process((await checkOf(id))!, guild, new Date(now.getTime() + 16 * 60_000));
    }
    expect(released.map((e) => e.userId)).toEqual(["fired"]);
    expect((await checkOf("back"))!.status).toBe(TicketClaimCheckStatus.DONE);
  });

  it("never releases an administrator", async () => {
    await StaffModel.create({ guildId: GUILD, userId: "boss", status: StaffStatus.FIRED, currentRoleLevel: 0 });
    await service.schedule(event("boss"), now);
    await service.process((await checkOf("boss"))!, guildWith({ boss: true }), now);
    expect(released).toHaveLength(0);
  });

  it("holds a tag-removal case until 3 days after the roles went", async () => {
    await StaffModel.create({ guildId: GUILD, userId: "tag", status: StaffStatus.FIRED, currentRoleLevel: 0 });
    const startedAt = new Date(now.getTime() - DAY);
    await StaffTagRestrictionModel.create({
      guildId: GUILD,
      staffId: "tag",
      kind: StaffTagRestrictionKind.TAG_REMOVED,
      startedAt,
      expiresAt: new Date(startedAt.getTime() + 3 * DAY),
    });
    await service.schedule(event("tag"), now);
    await service.process((await checkOf("tag"))!, guildWith({ tag: false }), now);
    const waiting = await checkOf("tag");
    expect(released).toHaveLength(0);
    expect(waiting!.status).toBe(TicketClaimCheckStatus.PENDING);
    expect(waiting!.dueAt.getTime()).toBe(startedAt.getTime() + 3 * DAY);
  });
});
