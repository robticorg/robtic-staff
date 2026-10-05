import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { Message } from "discord.js";
import mongoose from "mongoose";
import type { ContainerBuilder } from "discord.js";
import { parseDoneArgs } from "../../../commands/prefix/staff/done.ts";
import { parseGiveawayCustomId } from "../handlers/component-ids.ts";
import { buildGiveawayPickMenu, formatGiveawayEnd } from "../render/pick-menu.ts";
import { giveawayTitle } from "../services/giveaway-message.ts";
import { config } from "../../../config/index.ts";
import { GiveawayModel, GiveawayStatus } from "../models/giveaway.model.ts";
import { GiveawayProofModel } from "../models/giveaway-proof.model.ts";
import { buildGiveawayResult, giveawayResultLines } from "../render/result.ts";
import { messageTexts, parseMessageRef } from "../services/giveaway-message.ts";
import { findEndTime, isWinnerMessageFor, mentionedUserIds } from "../services/giveaway-parse.ts";
import { giveawayService } from "../services/giveaway.service.ts";

const BOT = "294882584201003009";
const USER_A = "111111111111111111";
const USER_B = "222222222222222222";
const GIVEAWAY_MSG = "1400000000000000001";
const ENDS = 1_790_000_000;

const NOW = new Date(ENDS * 1000 - 3_600_000);
const endOf = (texts: string[], embedTimestamps: (string | null)[] = []) =>
  findEndTime({ texts, embedTimestamps, now: NOW })?.getTime() ?? null;

describe("giveaway end time", () => {
  it("reads Ends: from the description", () => {
    expect(endOf([`Click 🎉 to enter!\nEnds: <t:${ENDS}:R> (<t:${ENDS}:f>)\nHosted by: <@1>`])).toBe(ENDS * 1000);
  });

  it("reads bold, field, Arabic and worded forms", () => {
    expect(endOf([`**Ends:** <t:${ENDS}:R>`])).toBe(ENDS * 1000);
    expect(endOf([`Ends: <t:${ENDS}:F>`])).toBe(ENDS * 1000);
    expect(endOf([`ينتهي: <t:${ENDS}:R>`])).toBe(ENDS * 1000);
    expect(endOf([`Ends in <t:${ENDS}:R>`])).toBe(ENDS * 1000);
  });

  it("falls back to the embed timestamp, then to any future timestamp", () => {
    expect(endOf(["Ends: soon"], ["2026-10-05T10:00:00.000Z"])).toBe(Date.parse("2026-10-05T10:00:00.000Z"));
    expect(endOf([`Prize: Nitro <t:${ENDS}:R>`])).toBe(ENDS * 1000);
  });

  it("returns null without an end time", () => {
    expect(endOf(["Enter now"])).toBeNull();
    expect(endOf([`old <t:${ENDS - 7_200}:R>`])).toBeNull();
  });
});

describe("giveaway message texts", () => {
  it("reads content, embeds and Components V2 text", () => {
    const texts = messageTexts({
      content: "",
      embeds: [{ description: "desc", fields: [{ name: "Ends", value: "x" }], footer: { text: "foot" } }],
      components: [
        { toJSON: () => ({ type: 17, components: [{ type: 10, content: `Ends: <t:${ENDS}:R>` }] }) },
      ],
    });
    expect(texts).toContain("desc");
    expect(texts).toContain("Ends: x");
    expect(texts).toContain("foot");
    expect(texts).toContain(`Ends: <t:${ENDS}:R>`);
  });
});

describe("giveaway message reference", () => {
  it("reads a message link with its channel", () => {
    expect(parseMessageRef(`https://discord.com/channels/1234567890123456789/2234567890123456789/${GIVEAWAY_MSG}`)).toEqual({
      channelId: "2234567890123456789",
      messageId: GIVEAWAY_MSG,
    });
    expect(parseMessageRef(`<https://ptb.discord.com/channels/1234567890123456789/2234567890123456789/${GIVEAWAY_MSG}>`)?.channelId).toBe(
      "2234567890123456789",
    );
  });

  it("reads a bare id, or channelId-messageId", () => {
    expect(parseMessageRef(GIVEAWAY_MSG)).toEqual({ channelId: null, messageId: GIVEAWAY_MSG });
    expect(parseMessageRef(`2234567890123456789-${GIVEAWAY_MSG}`)).toEqual({
      channelId: "2234567890123456789",
      messageId: GIVEAWAY_MSG,
    });
  });

  it("refuses anything else", () => {
    expect(parseMessageRef("abc")).toBeNull();
    expect(parseMessageRef(undefined)).toBeNull();
  });
});

describe("winner message", () => {
  const giveaway = { channelId: "c1", messageId: GIVEAWAY_MSG, botId: BOT, endsAt: new Date(ENDS * 1000) };
  const options = { earlyToleranceMs: 120_000, windowMs: 24 * 3_600_000 };
  const facts = (over: Partial<Parameters<typeof isWinnerMessageFor>[0]> = {}) => ({
    authorId: BOT,
    channelId: "c1",
    messageId: "m2",
    referencedMessageId: null,
    texts: [`Congratulations <@${USER_A}>! You won the **Nitro**!`],
    at: new Date(ENDS * 1000 + 5_000),
    ...over,
  });

  it("matches the same bot in the same channel after the end", () => {
    expect(isWinnerMessageFor(facts(), giveaway, options)).toBe(true);
    expect(isWinnerMessageFor(facts({ referencedMessageId: GIVEAWAY_MSG }), giveaway, options)).toBe(true);
  });

  it("ignores another bot, channel, the giveaway message itself, replies to others and early messages", () => {
    expect(isWinnerMessageFor(facts({ authorId: "other" }), giveaway, options)).toBe(false);
    expect(isWinnerMessageFor(facts({ channelId: "c2" }), giveaway, options)).toBe(false);
    expect(isWinnerMessageFor(facts({ messageId: GIVEAWAY_MSG }), giveaway, options)).toBe(false);
    expect(isWinnerMessageFor(facts({ referencedMessageId: "other" }), giveaway, options)).toBe(false);
    expect(isWinnerMessageFor(facts({ at: new Date(ENDS * 1000 - 3_600_000) }), giveaway, options)).toBe(false);
  });

  it("collects every winner mention once, without the bots", () => {
    expect(
      mentionedUserIds([`<@${USER_A}> and <@!${USER_B}> won`, `<@${USER_A}>`, `<@${BOT}>`], new Set([BOT])),
    ).toEqual([USER_A, USER_B]);
  });
});

describe("giveaway result text", () => {
  it("is sent as a plain message without mentions", () => {
    const message = buildGiveawayResult([{ userId: "w1", provedBy: "s1" }], 1);
    expect(message.components).toBeUndefined();
    expect(message.flags).toBeUndefined();
    expect(message.content).toContain("<@w1>");
    expect(message.allowedMentions).toEqual({ parse: [], repliedUser: false });
  });

  it("says who proved the condition and who did not, in Arabic", () => {
    const text = giveawayResultLines(
      [
        { userId: USER_A, provedBy: "staff1" },
        { userId: USER_B, provedBy: null },
      ],
      1,
    ).join("\n");
    expect(text).toContain(`<@${USER_A}> أثبت إنه نفّذ الشرط`);
    expect(text).toContain("<@staff1>");
    expect(text).toContain(`<@${USER_B}> ما أثبت إنه نفّذ الشرط`);
  });
});

describe("command arguments", () => {
  it("reads the member and an optional giveaway id in !done", () => {
    expect(parseDoneArgs([])).toEqual({ mentionedId: null, messageId: null });
    expect(parseDoneArgs([`<@${USER_A}>`])).toEqual({ mentionedId: USER_A, messageId: null });
    expect(parseDoneArgs([`<@${USER_A}>`, GIVEAWAY_MSG])).toEqual({ mentionedId: USER_A, messageId: GIVEAWAY_MSG });
    expect(parseDoneArgs([GIVEAWAY_MSG])).toEqual({ mentionedId: null, messageId: GIVEAWAY_MSG });
  });
});

describe("giveaway pick menu", () => {
  type Json = { type: number; custom_id?: string; options?: { label: string; value: string; description?: string }[]; components?: Json[] };
  const flat = (n: Json): Json[] => [n, ...(n.components ?? []).flatMap(flat)];

  it("lists every active giveaway with a title and its channel, for the command author", () => {
    const menu = buildGiveawayPickMenu("staff1", USER_A, [
      { giveawayId: "g1", title: "Nitro Boost", channelName: "giveaways", endsAt: new Date(ENDS * 1000) },
      { giveawayId: "g2", title: null, channelName: null, endsAt: new Date(ENDS * 1000) },
    ]);
    const nodes = (menu.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
    const select = nodes.find((n) => n.type === 3)!;
    expect(parseGiveawayCustomId(select.custom_id!)).toEqual({ action: "done", args: ["staff1", USER_A] });
    expect(select.options!.map((o) => o.value)).toEqual(["g1", "g2"]);
    expect(select.options![0]!.label).toBe("Nitro Boost");
    expect(select.options![0]!.description).toContain("#giveaways");
    expect(select.options![1]!.label).toBe("قيف أواي 2");
  });

  it("formats the end time in the bot timezone", () => {
    expect(formatGiveawayEnd(new Date("2026-10-05T10:00:00Z"), "UTC")).toBe("2026-10-05 10:00");
  });

  it("takes a clean title from the giveaway message", () => {
    expect(giveawayTitle({ content: "", embeds: [{ title: "**Nitro** 🎁", description: "Ends: <t:1:R>" }] })).toBe("Nitro 🎁");
    expect(giveawayTitle({ content: "🎉 **GIVEAWAY** 🎉", embeds: [] })).toBe("🎉 GIVEAWAY 🎉");
    expect(giveawayTitle({ content: "", embeds: [] })).toBeNull();
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

const GUILD = "giveaway-itest-guild";

describe.skipIf(!hasDb)("giveaway flow (MongoDB)", () => {
  beforeEach(async () => {
    await Promise.all([GiveawayModel.deleteMany({ guildId: GUILD }), GiveawayProofModel.deleteMany({ guildId: GUILD })]);
  });

  afterAll(async () => {
    if (!hasDb) return;
    await Promise.all([GiveawayModel.deleteMany({ guildId: GUILD }), GiveawayProofModel.deleteMany({ guildId: GUILD })]);
    await mongoose.disconnect();
  });

  it("has no target without a giveaway, so !done stays silent", async () => {
    expect(await giveawayService.target(GUILD, null)).toBeNull();
  });

  it("saves !done once and reports winners when the bot announces them", async () => {
    const endsAt = new Date(Date.now() + 60_000);
    const giveaway = await GiveawayModel.create({
      guildId: GUILD,
      channelId: "gw-channel",
      messageId: GIVEAWAY_MSG,
      botId: BOT,
      endsAt,
      createdBy: "admin",
    });
    const target = await giveawayService.target(GUILD, null);
    expect(target?.giveawayId).toBe(giveaway.giveawayId);
    expect(await giveawayService.markDone(target!, USER_A, "staff1")).toBe(true);
    expect(await giveawayService.markDone(target!, USER_A, "staff1")).toBe(false);

    const replies: unknown[] = [];
    const winnerMessage = {
      id: "winner-msg",
      channelId: "gw-channel",
      author: { id: BOT },
      client: { user: { id: "our-bot" } },
      content: `Congratulations <@${USER_A}> and <@${USER_B}>!`,
      embeds: [],
      reference: null,
      reply: async (payload: unknown) => {
        replies.push(payload);
        return payload;
      },
    } as unknown as Message<true>;

    expect(await giveawayService.handleBotMessage(winnerMessage, new Date(endsAt.getTime() + 5_000))).toBe(true);
    const ended = await GiveawayModel.findOne({ giveawayId: giveaway.giveawayId }).exec();
    expect(ended!.status).toBe(GiveawayStatus.ENDED);
    expect(ended!.winners).toEqual([USER_A, USER_B]);
    const text = JSON.stringify(replies[0]);
    expect(text).toContain("أثبت إنه نفّذ الشرط");
    expect(text).toContain("ما أثبت إنه نفّذ الشرط");

    expect(await giveawayService.target(GUILD, null)).toBeNull();
  });
});
