import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { clearPanelOverrides, getPanel, setPanelOverride } from "../../../data/tickets/index.ts";
import { addMember, makeGuild } from "../../applications/__tests__/fake-guild.ts";
import { TicketModel, ticketName } from "../models/ticket.model.ts";
import { ticketService } from "../services/ticket.service.ts";
import { TicketStatus } from "../types/enums.ts";

afterEach(() => clearPanelOverrides());

describe("ticket setup is per server", () => {
  it("setting up a panel in one server leaves every other server alone", () => {
    setPanelOverride("guild-a", "support", { supportRoleId: "role-a", categoryId: "cat-a" });
    setPanelOverride("guild-b", "support", { supportRoleId: "role-b", categoryId: "cat-b" });

    expect(getPanel("support", "guild-a")!.categoryId).toBe("cat-a");
    expect(getPanel("support", "guild-b")!.categoryId).toBe("cat-b");
    expect(getPanel("support", "guild-c")!.categoryId).toBe(getPanel("support", null)!.categoryId);
  });
});

describe("ticket names", () => {
  it("shows the per-server name, or the old id for tickets made before names", () => {
    expect(ticketName({ ticketId: "6f1c…", name: "support-1" })).toBe("support-1");
    expect(ticketName({ ticketId: "ticket-12" })).toBe("ticket-12");
  });
});

let hasDb = false;
try {
  await mongoose.connect(config.mongoUri, { dbName: `${config.mongoDbName}_test`, serverSelectionTimeoutMS: 1500 });
  hasDb = true;
} catch {
  hasDb = false;
}

const GUILDS = ["per-guild-itest-a", "per-guild-itest-b"] as const;
const CATEGORY = "per-guild-itest-category";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe.skipIf(!hasDb)("ticket ids across servers (MongoDB)", () => {
  const clean = async () => {
    await TicketModel.deleteMany({ guildId: { $in: [...GUILDS] } });
    await mongoose.connection.db!.collection("counters").deleteMany({ _id: { $regex: "^ticket:per-guild-itest-" } } as never);
  };
  beforeEach(clean);
  afterAll(async () => {
    if (!hasDb) return;
    await clean();
    await mongoose.disconnect();
  });

  it("each server numbers its own tickets, and every ticket gets its own UUID", async () => {
    const created = [];
    for (const guildId of GUILDS) {
      setPanelOverride(guildId, "support", { categoryId: CATEGORY });
      const guild = makeGuild(guildId, [CATEGORY], []);
      const member = addMember(guild, `${guildId}-member`, []);
      const { ticket } = await ticketService.createTicket({
        guild: guild as never,
        panel: getPanel("support", guildId)!,
        member: member as never,
        answers: [],
      });
      created.push(ticket);
    }

    const [a, b] = created;
    // Both servers start at 1 — this used to fail with "ticket DB write failed".
    expect(a!.name).toBe(b!.name!);
    expect(a!.ticketId).toMatch(UUID);
    expect(b!.ticketId).toMatch(UUID);
    expect(a!.ticketId).not.toBe(b!.ticketId);

    expect((await ticketService.getTicketByName(GUILDS[0], a!.name!))?.ticketId).toBe(a!.ticketId);
    expect((await ticketService.getTicketByName(GUILDS[1], b!.name!))?.ticketId).toBe(b!.ticketId);
  });

  it("finds a ticket made before names by its old id", async () => {
    await TicketModel.create({
      ticketId: "ticket-77",
      guildId: GUILDS[0],
      channelId: "c-old",
      userId: "u-old",
      panelId: "support",
      status: TicketStatus.OPEN,
    });
    expect((await ticketService.getTicketByName(GUILDS[0], "ticket-77"))?.channelId).toBe("c-old");
    expect(await ticketService.getTicketByName(GUILDS[1], "ticket-77")).toBeNull();
  });
});
