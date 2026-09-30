import { describe, expect, it } from "bun:test";
import { AttachmentBuilder, MessageFlags, type ContainerBuilder } from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { buildLogCard, logCardFromText } from "../log-card.ts";

type Json = { type: number; accent_color?: number; content?: string; components?: Json[]; items?: { media: { url: string } }[]; file?: { url: string } };
const TEXT = 10;
const MEDIA_GALLERY = 12;
const FILE = 13;

// Serialising runs discord.js' validation — the same check that would fail a send.
const json = (message: ReturnType<typeof buildLogCard>) =>
  (message.components as ContainerBuilder[]).map((c) => c.toJSON() as unknown as Json)[0]!;

describe("log card", () => {
  it("is a Components V2 card with no content or embeds", () => {
    const message = buildLogCard({ title: "Title", fields: [{ label: "A", value: "b" }] });
    expect(message.flags).toBe(MessageFlags.IsComponentsV2);
    expect(message.content).toBeUndefined();
    expect(message.embeds).toBeUndefined();
    expect(message.allowedMentions).toEqual({ parse: [] });
  });

  it("colours the bar by tone", () => {
    expect(json(buildLogCard({ title: "x", tone: "error" })).accent_color).toBe(colors.error);
    expect(json(buildLogCard({ title: "x", tone: "success" })).accent_color).toBe(colors.success);
  });

  it("turns a text log into title + body, keeping every line", () => {
    const card = json(logCardFromText("**Heading**\n**A:** 1\n**B:** 2", "warning", { at: null }));
    const texts = card.components!.filter((c) => c.type === TEXT).map((c) => c.content);
    expect(texts).toEqual(["**Heading**", "**A:** 1\n**B:** 2"]);
  });

  it("shows attached images in a gallery and other files as file components", () => {
    const message = buildLogCard({
      title: "x",
      files: [
        new AttachmentBuilder(Buffer.from("a"), { name: "proof.png" }),
        new AttachmentBuilder(Buffer.from("b"), { name: "ticket-1-transcript.txt" }),
      ],
    });
    const card = json(message);
    expect(card.components!.find((c) => c.type === MEDIA_GALLERY)!.items![0]!.media.url).toBe("attachment://proof.png");
    expect(card.components!.find((c) => c.type === FILE)!.file!.url).toBe("attachment://ticket-1-transcript.txt");
    expect(message.files).toHaveLength(2);
  });

  it("stays valid when a log is longer than Discord allows in one block", () => {
    expect(() => json(buildLogCard({ title: "x", lines: ["y".repeat(9000)] }))).not.toThrow();
  });
});
