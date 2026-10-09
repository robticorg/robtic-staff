import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { ContainerBuilder, Guild } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { getPanel } from "../../../data/tickets/index.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffOffDutyReason } from "../../staff/services/staff-duty-events.ts";
import { parseTicketCustomId } from "../handlers/component-ids.ts";
import { TicketModel } from "../models/ticket.model.ts";
import { buildClaimerOffDutyNotice } from "../render/claimer-off-duty.ts";
import {
  planClaimRelease,
  rolesToPing,
  ticketClaimerReleaseService,
} from "../services/ticket-claimer-release.service.ts";
import { TicketStatus } from "../types/enums.ts";

type Json = { type: number; content?: string; custom_id?: string; components?: Json[] };
const flat = (n: Json): Json[] => [n, ...(n.components ?? []).flatMap(flat)];
const BUTTON = 2;
const nodes = (message: { components?: unknown }) =>
  (message.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));

describe("planClaimRelease", () => {
  it("reopens a normal ticket the member claimed", () => {
    expect(planClaimRelease({ claimedByDiscordId: "s1", claimableRoles: [] }, "s1")).toEqual({
      wasMain: true,
      nextClaimerId: null,
      reopened: true,
    });
  });

  it("hands the ticket to a co-claimer when there is one", () => {
    const ticket = {
      claimedByDiscordId: "s1",
      claimableRoles: [
        { roleId: "r1", claimedBy: "s1" },
        { roleId: "r2", claimedBy: "s2" },
      ],
    };
    expect(planClaimRelease(ticket, "s1")).toEqual({ wasMain: true, nextClaimerId: "s2", reopened: false });
  });

  it("only frees the slot when the member is not the main claimer", () => {
    const ticket = { claimedByDiscordId: "s2", claimableRoles: [{ roleId: "r1", claimedBy: "s1" }] };
    expect(planClaimRelease(ticket, "s1")).toEqual({ wasMain: false, nextClaimerId: null, reopened: false });
  });
});

describe("rolesToPing", () => {
  it("pings the support role when the ticket reopens, plus open slot roles", () => {
    expect(rolesToPing({ supportRoleId: "support" }, [], true)).toEqual(["support"]);
    expect(
      rolesToPing(
        { supportRoleId: "support" },
        [
          { roleId: "r1" },
          { roleId: "r2", claimedBy: "x" },
          { roleId: "r3", closed: true },
        ],
        false,
      ),
    ).toEqual(["r1"]);
  });

  it("never pings for admin-only panels", () => {
    expect(rolesToPing({ supportRoleId: "" }, [], true)).toEqual([]);
  });
});

describe("off-duty notice", () => {
  it("offers the claim button and pings the roles", () => {
    const message = buildClaimerOffDutyNotice({
      ticketId: "ticket-9",
      staffId: "s1",
      onBreak: true,
      pingRoleIds: ["support"],
      claimable: true,
    });
    const all = nodes(message);
    const buttons = all.filter((n) => n.type === BUTTON);
    expect(buttons).toHaveLength(1);
    expect(parseTicketCustomId(buttons[0]!.custom_id!)).toEqual({ action: "claim", args: ["ticket-9"] });
    expect(all.some((n) => n.content?.includes("بريك"))).toBe(true);
    expect(all.some((n) => n.content?.includes("<@&support>"))).toBe(true);
    expect(message.allowedMentions).toEqual({ roles: ["support"] });
  });

  it("says fired and drops the button when someone else took over", () => {
    const all = nodes(
      buildClaimerOffDutyNotice({
        ticketId: "t",
        staffId: "s1",
        onBreak: false,
        pingRoleIds: [],
        claimable: false,
        movedToId: "s2",
      }),
    );
    expect(all.filter((n) => n.type === BUTTON)).toHaveLength(0);
    expect(all.some((n) => n.content?.includes("ما عاد في الطاقم الاداري"))).toBe(true);
    expect(all.some((n) => n.content?.includes("<@s2>"))).toBe(true);
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

const GUILD = "release-itest-guild";
const panel = getPanel("support", null)!;

function fakeGuild() {
  const sent: unknown[] = [];
  const deleted: string[] = [];
  const edited: { id: string; perms: unknown }[] = [];
  const channel = {
    isTextBased: () => true,
    send: async (message: unknown) => {
      sent.push(message);
      return { id: "m" };
    },
    setTopic: async () => undefined,
    messages: { fetch: async () => null },
    permissionOverwrites: {
      delete: async (id: string) => void deleted.push(id),
      edit: async (id: string, perms: unknown) => void edited.push({ id, perms }),
    },
  };
  const guild = { id: GUILD, channels: { fetch: async () => channel } } as unknown as Guild;
  return { guild, sent, deleted, edited };
}

describe.skipIf(!hasDb)("releasing an off-duty claimer (MongoDB)", () => {
  beforeEach(async () => {
    await TicketModel.deleteMany({ guildId: GUILD });
    await StaffModel.deleteMany({ guildId: GUILD });
  });

  afterAll(async () => {
    if (!hasDb) return;
    await TicketModel.deleteMany({ guildId: GUILD });
    await StaffModel.deleteMany({ guildId: GUILD });
    await mongoose.disconnect();
  });

  it("reopens every ticket the fired staff claimed and leaves the rest alone", async () => {
    const base = { guildId: GUILD, userId: "owner", panelId: panel.id };
    await TicketModel.create([
      { ...base, ticketId: "rel-1", channelId: "c1", status: TicketStatus.CLAIMED, claimedByDiscordId: "s1", transferredFrom: "s0" },
      { ...base, ticketId: "rel-2", channelId: "c2", status: TicketStatus.CLAIMED, claimedByDiscordId: "s1" },
      { ...base, ticketId: "rel-3", channelId: "c3", status: TicketStatus.CLAIMED, claimedByDiscordId: "s9" },
      { ...base, ticketId: "rel-4", channelId: "c4", status: TicketStatus.CLOSED, claimedByDiscordId: "s1" },
    ]);
    const { guild, sent, deleted, edited } = fakeGuild();

    const released = await ticketClaimerReleaseService.release(guild, {
      guildId: GUILD,
      userId: "s1",
      actorId: "admin",
      reason: StaffOffDutyReason.FIRED,
    });

    expect(released).toBe(2);
    for (const id of ["rel-1", "rel-2"]) {
      const ticket = await TicketModel.findOne({ ticketId: id }).lean();
      expect(ticket?.status).toBe(TicketStatus.OPEN);
      expect(ticket?.claimedByDiscordId).toBeUndefined();
      expect(ticket?.transferredFrom).toBeUndefined();
    }
    expect((await TicketModel.findOne({ ticketId: "rel-3" }).lean())?.claimedByDiscordId).toBe("s9");
    expect((await TicketModel.findOne({ ticketId: "rel-4" }).lean())?.status).toBe(TicketStatus.CLOSED);
    expect(deleted).toEqual(["s1", "s1"]);
    expect(edited.filter((e) => e.id === panel.supportRoleId)).toHaveLength(2);
    expect(sent.length).toBeGreaterThanOrEqual(2);
  });

  it("frees role slots and passes the ticket to the co-claimer", async () => {
    await TicketModel.create({
      guildId: GUILD,
      userId: "owner",
      panelId: panel.id,
      ticketId: "rel-5",
      channelId: "c5",
      status: TicketStatus.CLAIMED,
      claimedByDiscordId: "s1",
      claimableRoles: [
        { roleId: "r1", claimedBy: "s1" },
        { roleId: "r2", claimedBy: "s2" },
      ],
    });
    const { guild } = fakeGuild();

    await ticketClaimerReleaseService.release(guild, {
      guildId: GUILD,
      userId: "s1",
      actorId: "admin",
      reason: StaffOffDutyReason.BREAK,
    });

    const ticket = await TicketModel.findOne({ ticketId: "rel-5" }).lean();
    expect(ticket?.status).toBe(TicketStatus.CLAIMED);
    expect(ticket?.claimedByDiscordId).toBe("s2");
    expect(ticket?.claimableRoles.find((s) => s.roleId === "r1")?.claimedBy).toBeUndefined();
  });
});
