import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { ChannelType, type Guild } from "discord.js";
import { clearPanelOverrides, setPanelOverride, tickets } from "../../../data/tickets/index.ts";
import { minecraftPanel } from "../../../data/tickets/panels/minecraft.ts";
import { supportPanel } from "../../../data/tickets/panels/support.ts";
import { channelConfigService } from "../../configuration/services/channel-config.service.ts";
import { intakeService, intakeTarget } from "../../intake/services/intake.service.ts";
import { buildTicketPanelMessage } from "../render/panel-message.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";

const CATEGORY = "100000000000000001";
const ROLE = "100000000000000002";

/** A server with one category and one role — nothing else exists. */
const guild = {
  id: "100000000000000000",
  channels: { fetch: async (id: string) => (id === CATEGORY ? { id, type: ChannelType.GuildCategory } : null) },
  roles: { fetch: async (id: string) => (id === ROLE ? { id } : null) },
} as unknown as Guild;

let closed = new Set<string>();

beforeEach(() => {
  closed = new Set();
  spyOn(intakeService, "closure").mockImplementation(async (_g, target) =>
    closed.has(target) ? { closedBy: "1", closedAt: new Date(), reason: null } : null,
  );
  spyOn(channelConfigService, "getChannelId").mockResolvedValue(null);
});

afterEach(() => clearPanelOverrides());

const openIds = async () => (await ticketConfigService.listOpenPublicPanels(guild)).map((p) => p.id);

describe("ticket panel in a new server", () => {
  it("a type that isn't set up counts as closed and is left off the panel", async () => {
    expect(await ticketConfigService.isPanelReady(guild, supportPanel)).toBe(false);
    expect(await openIds()).not.toContain(supportPanel.id);
    expect(await openIds()).not.toContain(minecraftPanel.id);
  });

  it("opens by itself once it is set up", async () => {
    setPanelOverride(supportPanel.id, { supportRoleId: ROLE, categoryId: CATEGORY });
    expect(await openIds()).toContain(supportPanel.id);
    expect(await openIds()).not.toContain(minecraftPanel.id);
  });

  it("a set-up type closed with /intake close is left off too", async () => {
    setPanelOverride(supportPanel.id, { supportRoleId: ROLE, categoryId: CATEGORY });
    closed.add(intakeTarget.panel(supportPanel.id));
    expect(await openIds()).not.toContain(supportPanel.id);
  });

  it("a support role that was deleted makes it closed again", async () => {
    setPanelOverride(supportPanel.id, { supportRoleId: "100000000000000099", categoryId: CATEGORY });
    expect(await openIds()).not.toContain(supportPanel.id);
  });

  it("with nothing open the panel still sends, without a select menu", () => {
    const json = JSON.stringify(buildTicketPanelMessage(tickets.main, []));
    expect(json).not.toContain('"type":3');
  });
});
