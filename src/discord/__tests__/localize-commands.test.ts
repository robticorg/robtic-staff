import { describe, expect, test } from "bun:test";
import { commands } from "../../commands/index.ts";
import { localizeCommand } from "../register-commands.ts";

// Slash commands go up in English with the Arabic as Discord's `ar` localization.
const ARABIC = /[\u0600-\u06FF]/;

describe("slash command localization", () => {
  const out = commands.map((c) => localizeCommand(c.data.toJSON()));
  const texts: { path: string; text: string; localized: boolean }[] = [];
  const walk = (n: unknown, path: string) => {
    if (Array.isArray(n)) return n.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    if (typeof o.description === "string") texts.push({ path: `${path}.description`, text: o.description, localized: !!o.description_localizations });
    if (typeof o.name === "string" && "value" in o) texts.push({ path: `${path}.name`, text: o.name, localized: !!o.name_localizations });
    for (const [k, v] of Object.entries(o)) if (v && typeof v === "object") walk(v, `${path}.${k}`);
  };
  out.forEach((c) => walk(c, String((c as { name: string }).name)));

  test("no Arabic is left as the base text", () => {
    expect(texts.filter((t) => ARABIC.test(t.text)).map((t) => `${t.path}: ${t.text}`)).toEqual([]);
  });
  test("every text fits Discord's limit", () => {
    expect(texts.filter((t) => t.text.length > 100).map((t) => t.path)).toEqual([]);
  });
  test("descriptions carry the Arabic", () => {
    expect(texts.filter((t) => t.localized).length).toBeGreaterThan(20);
  });
});
