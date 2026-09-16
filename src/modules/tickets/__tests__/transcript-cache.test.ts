import { describe, expect, it } from "bun:test";
import type { Message } from "discord.js";
import { transcriptCache } from "../services/transcript-cache.ts";
import { limits } from "../../../data/config/limits.ts";

function fakeMessage(
  channelId: string,
  id: string,
  overrides: Partial<{ content: string; bot: boolean; embeds: unknown[]; attachments: { name: string; url: string }[] }> = {},
): Message {
  const attachments = overrides.attachments ?? [];
  return {
    id,
    channel: { id: channelId },
    author: { id: `author-${id}`, tag: `author-${id}#0001`, bot: overrides.bot ?? false },
    content: overrides.content ?? `content-${id}`,
    embeds: (overrides.embeds ?? []).map((e) => ({ toJSON: () => e })),
    attachments: new Map(attachments.map((a) => [a.name, a])),
    createdTimestamp: Date.now(),
  } as unknown as Message;
}

describe("transcriptCache", () => {
  it("ignores messages from untracked channels", () => {
    transcriptCache.record(fakeMessage("untracked-chan", "m1"));
    expect(transcriptCache.flush("untracked-chan")).toEqual([]);
  });

  it("captures content, bot flag, embeds and attachments for a tracked channel", () => {
    transcriptCache.track("chan-a");
    transcriptCache.record(
      fakeMessage("chan-a", "m1", {
        content: "hello",
        bot: true,
        embeds: [{ title: "T" }],
        attachments: [{ name: "img.png", url: "https://x/img.png" }],
      }),
    );

    const flushed = transcriptCache.flush("chan-a");
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toMatchObject({
      id: "m1",
      content: "hello",
      bot: true,
      embeds: [{ title: "T" }],
      attachments: [{ name: "img.png", url: "https://x/img.png" }],
    });
  });

  it("flush() stops tracking the channel", () => {
    transcriptCache.track("chan-b");
    transcriptCache.flush("chan-b");
    expect(transcriptCache.isTracked("chan-b")).toBe(false);

    transcriptCache.record(fakeMessage("chan-b", "m2"));
    transcriptCache.track("chan-b");
    expect(transcriptCache.flush("chan-b")).toEqual([]);
  });

  it("keeps only the most recent transcriptMessageCap messages", () => {
    transcriptCache.track("chan-c");
    for (let i = 0; i < limits.transcriptMessageCap + 5; i++) {
      transcriptCache.record(fakeMessage("chan-c", `m${i}`));
    }
    const flushed = transcriptCache.flush("chan-c");
    expect(flushed).toHaveLength(limits.transcriptMessageCap);
    expect(flushed[0]!.id).toBe("m5");
    expect(flushed.at(-1)!.id).toBe(`m${limits.transcriptMessageCap + 4}`);
  });
});
