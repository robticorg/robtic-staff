import { describe, expect, it } from "bun:test";
import { prefixCommandAliases } from "../../../data/commands/prefix-aliases.ts";
import { prefixCommands } from "../../../commands/prefix/index.ts";
import { moderationActionService } from "../services/moderation-action.service.ts";

describe("!jail / !unjail", () => {
  it("registers both as staff commands", () => {
    for (const name of ["jail", "unjail"]) {
      const command = prefixCommands.find((c) => c.name === name);
      expect(command).toBeDefined();
      expect(command?.category).toBe("staff");
    }
  });

  it("answers to !سجن and !فك", () => {
    expect(prefixCommandAliases.jail).toContain("سجن");
    expect(prefixCommandAliases.unjail).toContain("فك");
  });
});

describe("moderation actions are implemented once", () => {
  it("exposes the shared jail, unjail and timeout entry points", () => {
    expect(typeof moderationActionService.jail).toBe("function");
    expect(typeof moderationActionService.unjail).toBe("function");
    expect(typeof moderationActionService.timeout).toBe("function");
  });

  it("is the only place the panel and the commands build a punishment from", async () => {
    const [panel, jail, unjail] = await Promise.all([
      Bun.file("src/modules/warning-panel/services/warning-panel.service.ts").text(),
      Bun.file("src/commands/prefix/staff/jail.ts").text(),
      Bun.file("src/commands/prefix/staff/unjail.ts").text(),
    ]);

    for (const source of [panel, jail, unjail]) {
      expect(source).toContain("moderationActionService");
      // None may assemble its own punishment — that is what drifts.
      expect(source).not.toContain("createPunishment");
      expect(source).not.toContain("executeAction");
      expect(source).not.toContain("reversePunishment");
    }
  });
});

describe("timeout, jail and user warnings are logged, never announced", () => {
  it("keeps the staff-warning channel out of the punishment path", async () => {
    const source = await Bun.file(
      "src/modules/punishment/services/moderation-action.service.ts",
    ).text();

    expect(source).toContain("punishmentLogService");
    expect(source).not.toContain("staffWarningLogService");
  });

  it("keeps the staff-warning channel out of the user-warning path", async () => {
    const source = await Bun.file(
      "src/modules/warnings/services/warning-actions.service.ts",
    ).text();

    // issueUserWarning must not reach the announce channel; the staff-warning
    // methods further down the file still may.
    const userWarn = source.slice(
      source.indexOf("async issueUserWarning"),
      source.indexOf("async issueVerbalStaffWarning"),
    );
    expect(userWarn.length).toBeGreaterThan(0);
    expect(userWarn).toContain("postWarnLog");
    expect(userWarn).not.toContain("staffWarningLogService");
  });
});
