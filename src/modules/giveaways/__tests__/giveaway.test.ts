import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { Message } from "discord.js";
import mongoose from "mongoose";
import { doneMessageIdArg } from "../../../commands/prefix/staff/done.ts";
import { giveawayMessageIdArg } from "../../../commands/prefix/staff/giveaway.ts";
import { config } from "../../../config/index.ts";
import { GiveawayModel, GiveawayStatus } from "../models/giveaway.model.ts";
import { GiveawayProofModel } from "../models/giveaway-proof.model.ts";
import { giveawayResultLines } from "../render/result.ts";
import { isWinnerMessageFor, mentionedUserIds, parseEndsAt } from "../services/giveaway-parse.ts";
import { giveawayService } from "../services/giveaway.service.ts";

const BOT = "294882584201003009";
const USER_A = "111111111111111111";
const USER_B = "222222222222222222";
const GIVEAWAY_MSG = "1400000000000000001";
const ENDS = 1_790_000_000;

describe("giveaway end time", () => {
  it("reads Ends: from the description", () => {
    const at = parseEndsAt([{ description: `Click 🎉 to enter!\nEnds: <t:${ENDS}:R> (<t:${ENDS}:f>)\nHosted by: <@1>` }]);
    expect(at?.getTime()).toBe(ENDS * 1000);
  });

  it("reads bold or field forms", () => {
    expect(parseEndsAt([{ description: `**Ends:** <t:${ENDS}:R>` }])?.getTime()).toBe(ENDS * 1000);
    expect(parseEndsAt([{ fields: [{ name: "Ends", value: `<t:${ENDS}:F>` }] }])?.getTime()).toBe(ENDS * 1000);
  });

  it("falls back to the embed timestamp", () => {
    expect(parseEndsAt([{ description: "no time here", timestamp: "2026-10-05T10:00:00.000Z" }])?.toISOString()).toBe(
      "2026-10-05T10:00:00.000Z",
    );
  });

  it("returns null without an end time", () => {
    expect(parseEndsAt([{ description: "Enter now" }])).toBeNull();
    expect(parseEndsAt([])).toBeNull();
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
  it("reads the giveaway message id or link", () => {
    expect(giveawayMessageIdArg([GIVEAWAY_MSG])).toBe(GIVEAWAY_MSG);
    expect(giveawayMessageIdArg([`https://discord.com/channels/1/2/${GIVEAWAY_MSG}`])).toBe(GIVEAWAY_MSG);
    expect(giveawayMessageIdArg(["abc"])).toBeNull();
    expect(giveawayMessageIdArg([])).toBeNull();
  });

  it("reads an optional giveaway id after the member in !done", () => {
    expect(doneMessageIdArg([`<@${USER_A}>`], USER_A)).toBeNull();
    expect(doneMessageIdArg([`<@${USER_A}>`, GIVEAWAY_MSG], USER_A)).toBe(GIVEAWAY_MSG);
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
