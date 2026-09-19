import { describe, expect, it } from "bun:test";
import { prefixCommandAliases } from "../../../data/commands/prefix-aliases.ts";
import { prefixCommands } from "../../../commands/prefix/index.ts";
import { moderationActionService } from "../services/moderation-action.service.ts";

describe("!jail", () => {
  const jail = prefixCommands.find((c) => c.name === "jail");

  it("is registered as a staff command", () => {
    expect(jail).toBeDefined();
    expect(jail?.category).toBe("staff");
  });

  it("answers to !سجن", () => {
    expect(prefixCommandAliases.jail).toContain("سجن");
  });
});

describe("moderation actions are implemented once", () => {
  it("exposes the shared jail and timeout entry points", () => {
    expect(typeof moderationActionService.jail).toBe("function");
    expect(typeof moderationActionService.timeout).toBe("function");
  });

  it("is the only place the panel and the command build a punishment from", async () => {
    const [panel, command] = await Promise.all([
      Bun.file("src/modules/warning-panel/services/warning-panel.service.ts").text(),
      Bun.file("src/commands/prefix/staff/jail.ts").text(),
    ]);

    for (const source of [panel, command]) {
      expect(source).toContain("moderationActionService");
      // Neither may assemble its own punishment — that is what drifts.
      expect(source).not.toContain("createPunishment");
      expect(source).not.toContain("executeAction");
    }
  });
});
