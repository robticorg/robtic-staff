import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Client } from "discord.js";
import {
  createTransferConfirmation,
  isTransferConfirmation,
  parseTransferLine,
} from "../services/delivery/transfer-confirmation.ts";

const BOT = "1505622388975468684";
const USER = "1382335608608915558";
const CHANNEL = "transfer-channel";
const LINE = `💰 | **raouf._.159**, has transferred **$100** to <@${USER}>.`;

const lineFor = (sender: string, amount: string, receiver: string) =>
  `💰 | **${sender}**, has transferred **$${amount}** to <@${receiver}>.`;

describe("transfer line", () => {
  it("reads the sender, the amount and the receiver", () => {
    expect(parseTransferLine(LINE)).toEqual({ sender: "raouf._.159", amount: "100", userId: USER });
    expect(parseTransferLine(`💰 | **x**, has transferred **$5,000,000** to <@!${USER}>.`)).toEqual({
      sender: "x",
      amount: "5000000",
      userId: USER,
    });
  });

  it("works for any sender name", () => {
    const senders = ["raouf._.159", "Steve", "عبدالرؤوف", "cool name 🎁", "user\\_name", "a.b-c"];
    for (const sender of senders) {
      const parsed = parseTransferLine(lineFor(sender, "250", USER));
      expect(parsed?.amount).toBe("250");
      expect(parsed?.userId).toBe(USER);
      expect(parsed?.sender).toBe(sender.replace("\\_", "_"));
    }
  });

  it("works for any receiver", () => {
    for (const receiver of ["111111111111111111", "222222222222222222", "1382335608608915558"]) {
      expect(parseTransferLine(lineFor("sender", "100", receiver))?.userId).toBe(receiver);
    }
  });

  it("still matches when the sender is not in bold", () => {
    expect(parseTransferLine(`💰 | someone has transferred **$100** to <@${USER}>.`)).toEqual({
      sender: null,
      amount: "100",
      userId: USER,
    });
  });

  it("ignores other messages", () => {
    expect(parseTransferLine("hello")).toBeNull();
    expect(parseTransferLine(`<@${USER}> has 100 credits`)).toBeNull();
  });
});

describe("transfer confirmation match", () => {
  const expected = { channelId: CHANNEL, userId: USER, amount: "100" };
  const message = (overrides: Partial<{ authorId: string; channelId: string; text: string }> = {}) => ({
    authorId: overrides.authorId ?? BOT,
    channelId: overrides.channelId ?? CHANNEL,
    texts: [overrides.text ?? LINE],
  });

  it("matches the transfer bot, channel, receiver and amount", () => {
    expect(isTransferConfirmation(message(), expected, BOT)).toBe(true);
  });

  it("accepts any sender, and checks the receiver against each gift", () => {
    const other = "999999999999999999";
    expect(isTransferConfirmation(message({ text: lineFor("anyone", "100", USER) }), expected, BOT)).toBe(true);
    expect(
      isTransferConfirmation(
        message({ text: lineFor("anyone", "100", other) }),
        { ...expected, userId: other },
        BOT,
      ),
    ).toBe(true);
    expect(isTransferConfirmation(message({ text: lineFor("anyone", "100", other) }), expected, BOT)).toBe(false);
  });

  it("rejects another author, channel, receiver or amount", () => {
    expect(isTransferConfirmation(message({ authorId: "someone" }), expected, BOT)).toBe(false);
    expect(isTransferConfirmation(message({ channelId: "other" }), expected, BOT)).toBe(false);
    expect(isTransferConfirmation(message({ text: LINE.replace(USER, "999") }), expected, BOT)).toBe(false);
    expect(isTransferConfirmation(message({ text: LINE.replace("$100", "$10") }), expected, BOT)).toBe(false);
  });
});

describe("transfer confirmation watcher", () => {
  const discordMessage = (authorId: string, content: string) => ({
    author: { id: authorId },
    channelId: CHANNEL,
    content,
    embeds: [],
  });

  function setup(timeoutMs = 50) {
    const client = new EventEmitter();
    const expect_ = createTransferConfirmation(() => client as unknown as Client, { botId: BOT, timeoutMs });
    return { client, pending: expect_({ channelId: CHANNEL, userId: USER, amount: "100" }) };
  }

  it("confirms when the message arrives while waiting", async () => {
    const { client, pending } = setup();
    const result = pending.wait();
    client.emit("messageCreate", discordMessage(BOT, LINE));
    expect(await result).toBe(true);
    expect(client.listenerCount("messageCreate")).toBe(0);
  });

  it("confirms when the message arrived before waiting started", async () => {
    const { client, pending } = setup();
    client.emit("messageCreate", discordMessage(BOT, LINE));
    expect(await pending.wait()).toBe(true);
  });

  it("fails after the timeout when nothing matching arrives", async () => {
    const { client, pending } = setup(30);
    const result = pending.wait();
    client.emit("messageCreate", discordMessage("someone", LINE));
    expect(await result).toBe(false);
    expect(client.listenerCount("messageCreate")).toBe(0);
  });

  it("stops listening when cancelled", () => {
    const { client, pending } = setup();
    pending.cancel();
    expect(client.listenerCount("messageCreate")).toBe(0);
  });
});
