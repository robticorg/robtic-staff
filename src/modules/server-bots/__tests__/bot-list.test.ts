import { describe, expect, it } from "bun:test";
import { buildBotListPages, sortBots } from "../render/bot-list.ts";

const bot = (id: string, admin = false, joinedAt: number | null = 1) => ({ id, tag: `bot-${id}`, admin, joinedAt });

describe("!bots list", () => {
  it("lists admin bots first, then by join date", () => {
    expect(sortBots([bot("a", false, 1), bot("b", true, 5), bot("c", false, 0)]).map((b) => b.id)).toEqual(["b", "c", "a"]);
  });

  it("shows every bot with its id and the admin count", () => {
    const [page] = buildBotListPages([bot("111", true), bot("222")]);
    expect(page).toContain("<@111>");
    expect(page).toContain("`222`");
    expect(page).toContain("(2)");
    expect(page).toContain("**1**");
  });

  it("splits long lists under the message limit", () => {
    const pages = buildBotListPages(Array.from({ length: 60 }, (_, i) => bot(String(100000000000000000n + BigInt(i)))));
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) expect(page.length).toBeLessThanOrEqual(2000);
    expect(pages.join("\n").match(/<@\d+>/g)).toHaveLength(60);
  });
});
