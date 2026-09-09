import { describe, expect, it } from "bun:test";
import { prefixCommandAliases } from "../../../data/commands/prefix-aliases.ts";
import { prefixCommands } from "../index.ts";

const canonicalNames = new Set(prefixCommands.map((c) => c.name));
const englishAliases = new Set(prefixCommands.flatMap((c) => c.aliases ?? []));

describe("arabic prefix aliases", () => {
  it("every alias group targets a real command", () => {
    for (const name of Object.keys(prefixCommandAliases)) {
      expect(canonicalNames.has(name)).toBe(true);
    }
  });

  it("no arabic alias collides with an english command name or alias", () => {
    for (const aliases of Object.values(prefixCommandAliases)) {
      for (const alias of aliases) {
        expect(canonicalNames.has(alias)).toBe(false);
        expect(englishAliases.has(alias)).toBe(false);
      }
    }
  });

  it("no arabic alias is shared between two commands", () => {
    const seen = new Set<string>();
    for (const aliases of Object.values(prefixCommandAliases)) {
      for (const alias of aliases) {
        expect(seen.has(alias)).toBe(false);
        seen.add(alias);
      }
    }
  });

  it("resolves the same command map the runner builds", () => {
    const map = new Map<string, string>();
    for (const command of prefixCommands) {
      map.set(command.name, command.name);
      for (const alias of command.aliases ?? []) map.set(alias, command.name);
    }
    for (const [name, aliases] of Object.entries(prefixCommandAliases)) {
      for (const alias of aliases) map.set(alias, name);
    }
    expect(map.get("استلام")).toBe("claim");
    expect(map.get("اغلاق")).toBe("close");
    expect(map.get("فصل")).toBe("fire");
    expect(map.get("ترقية")).toBe("prompt");
    expect(map.get("تحذير")).toBe("warn");
    expect(map.get("بريك")).toBe("break");
    expect(map.get("نقاطي")).toBe("points");
    expect(map.get("المتصدرين")).toBe("leaderboard");
    expect(map.get("claim")).toBe("claim");
    expect(map.get("lb")).toBe("leaderboard");
  });
});
