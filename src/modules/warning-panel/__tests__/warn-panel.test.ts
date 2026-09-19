import { describe, expect, it } from "bun:test";
import { ComponentType, type Client } from "discord.js";
import { WarnPanelAction, warnPanelConfig } from "../../../data/warn-panel/config.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { TIMEOUT_MAX_MS, TIMEOUT_MIN_MS } from "../../punishment/services/duration.service.ts";
import {
  formatStaffWarningMessage,
  formatVerbalStaffWarningMessage,
} from "../../warnings/render/staff-warn-message.ts";
import { WarnPanelField } from "../handlers/component-ids.ts";
import {
  buildJailModal,
  buildStaffWarnModal,
  buildTimeoutModal,
  buildUserWarnModal,
} from "../render/modals.ts";
import { buildWarningPanel } from "../render/panel.ts";
import { WarningPanelService } from "../services/warning-panel.service.ts";
import { WarningPanelRefreshService } from "../services/warning-panel-refresh.service.ts";

const service = new WarningPanelService();

interface ModalJson {
  title: string;
  custom_id: string;
  components: { type: number; component?: { type: number; custom_id?: string } }[];
}

const json = (modal: { toJSON: () => unknown }) => modal.toJSON() as unknown as ModalJson;

const fieldTypes = (modal: ModalJson): Record<string, number> =>
  Object.fromEntries(
    modal.components
      .filter((c) => c.component?.custom_id)
      .map((c) => [c.component!.custom_id!, c.component!.type]),
  );

describe("warning panel", () => {
  it("offers exactly the four actions", () => {
    const panel = buildWarningPanel() as { components: { toJSON: () => unknown }[] };
    const container = panel.components[0]!.toJSON() as {
      components: { type: number; components?: { options?: { value: string }[] }[] }[];
    };

    const select = container.components
      .flatMap((c) => c.components ?? [])
      .find((c) => c.options);

    expect(select?.options?.map((o) => o.value)).toEqual([
      WarnPanelAction.TIMEOUT,
      WarnPanelAction.JAIL,
      WarnPanelAction.USER_WARN,
      WarnPanelAction.STAFF_WARN,
    ]);
  });

  it('labels the timeout action "تايم اوت", not "توقيت"', () => {
    const panel = JSON.stringify(buildWarningPanel());
    expect(panel).toContain("تايم اوت");
    expect(panel).not.toContain("توقيت");
  });
});

describe("warning panel modals", () => {
  it("picks the user with a native user select, never a typed id", () => {
    for (const modal of [
      buildTimeoutModal(),
      buildJailModal(),
      buildUserWarnModal(),
      buildStaffWarnModal(),
    ]) {
      const types = fieldTypes(json(modal));
      expect(types[WarnPanelField.user]).toBe(ComponentType.UserSelect);
    }
  });

  it("collects evidence with a native file upload, never pasted URLs", () => {
    for (const modal of [
      buildTimeoutModal(),
      buildJailModal(),
      buildUserWarnModal(),
      buildStaffWarnModal(),
    ]) {
      const types = fieldTypes(json(modal));
      expect(types[WarnPanelField.evidence]).toBe(ComponentType.FileUpload);
    }
  });

  it("asks for a duration on timeout only", () => {
    expect(fieldTypes(json(buildTimeoutModal()))).toHaveProperty(WarnPanelField.duration);
    for (const modal of [buildJailModal(), buildUserWarnModal(), buildStaffWarnModal()]) {
      expect(fieldTypes(json(modal))).not.toHaveProperty(WarnPanelField.duration);
    }
  });

  it("offers the verbal checkbox on staff warnings only, defaulting to a real warning", () => {
    const checkbox = json(buildStaffWarnModal()).components.find(
      (c) => c.component?.custom_id === WarnPanelField.verbal,
    )?.component as { type: number; default?: boolean } | undefined;

    expect(checkbox?.type).toBe(ComponentType.Checkbox);
    expect(checkbox?.default).toBe(false);

    for (const modal of [buildTimeoutModal(), buildJailModal(), buildUserWarnModal()]) {
      expect(fieldTypes(json(modal))).not.toHaveProperty(WarnPanelField.verbal);
    }
  });

  it("caps evidence at the shared punishment limit", () => {
    const evidence = json(buildTimeoutModal()).components.find(
      (c) => c.component?.custom_id === WarnPanelField.evidence,
    )?.component as { max_values?: number; min_values?: number } | undefined;

    expect(evidence?.max_values).toBe(warnPanelConfig.maxEvidenceFiles);
    expect(evidence?.min_values).toBe(warnPanelConfig.minEvidenceFiles);
  });

  it("gives each modal its own custom id so the router can tell them apart", () => {
    const ids = [
      buildTimeoutModal(),
      buildJailModal(),
      buildUserWarnModal(),
      buildStaffWarnModal(),
    ].map((m) => json(m).custom_id);

    expect(new Set(ids).size).toBe(4);
    for (const id of ids) expect(id.startsWith("wp:")).toBe(true);
  });
});

describe("panel refresh", () => {
  const deployment = { guildId: "g", channelId: "c", messageId: "m" };

  function fakeClient(edits: { count: number }) {
    return {
      channels: {
        fetch: async () => ({
          isTextBased: () => true,
          messages: {
            fetch: async () => ({
              edit: async () => {
                edits.count += 1;
              },
            }),
          },
        }),
      },
    } as unknown as Client;
  }

  it("edits the stored message so the select clears", async () => {
    const edits = { count: 0 };
    const service = new WarningPanelRefreshService();

    expect(await service.refreshDeployment(deployment, { client: fakeClient(edits) })).toBe(
      "refreshed",
    );
    expect(edits.count).toBe(1);
  });

  it("skips an edit it already did inside the interval", async () => {
    const edits = { count: 0 };
    const service = new WarningPanelRefreshService();
    const client = fakeClient(edits);

    await service.refreshDeployment(deployment, { client });
    expect(await service.refreshDeployment(deployment, { client })).toBe("skipped");
    expect(edits.count).toBe(1);
  });

  it("still edits when the caller forces it, so a use always clears the menu", async () => {
    const edits = { count: 0 };
    const service = new WarningPanelRefreshService();
    const client = fakeClient(edits);

    await service.refreshDeployment(deployment, { client });
    expect(await service.refreshDeployment(deployment, { client, force: true })).toBe("refreshed");
    expect(edits.count).toBe(2);
  });

  it("reports a deleted message instead of throwing", async () => {
    const service = new WarningPanelRefreshService();
    const client = {
      channels: {
        fetch: async () => ({
          isTextBased: () => true,
          messages: { fetch: async () => null },
        }),
      },
    } as unknown as Client;

    expect(await service.refreshDeployment(deployment, { client })).toBe("message-gone");
  });

  it("reports a deleted channel instead of throwing", async () => {
    const service = new WarningPanelRefreshService();
    const client = {
      channels: { fetch: async () => null },
    } as unknown as Client;

    expect(await service.refreshDeployment(deployment, { client })).toBe("channel-gone");
  });

  it("does not start a timer when the interval is disabled", () => {
    const service = new WarningPanelRefreshService();
    const original = warnPanelConfig.refreshIntervalMs;

    try {
      (warnPanelConfig as { refreshIntervalMs: number }).refreshIntervalMs = 0;
      service.start();
      expect(service.stop()).toBeUndefined();
    } finally {
      (warnPanelConfig as { refreshIntervalMs: number }).refreshIntervalMs = original;
    }
  });
});

describe("timeout duration validation", () => {
  it("accepts the documented formats through the shared parser", () => {
    expect(service.parseTimeoutDuration("5m")).toBe(5 * 60_000);
    expect(service.parseTimeoutDuration("1h")).toBe(3_600_000);
    expect(service.parseTimeoutDuration("7d")).toBe(7 * 86_400_000);
  });

  it("rejects a missing or unparseable duration", () => {
    expect(() => service.parseTimeoutDuration(undefined)).toThrow(DomainError);
    expect(() => service.parseTimeoutDuration("")).toThrow(DomainError);
    expect(() => service.parseTimeoutDuration("soon")).toThrow(DomainError);
  });

  it("rejects rather than silently clamping past Discord's 28-day cap", () => {
    expect(() => service.parseTimeoutDuration("29d")).toThrow(DomainError);
    expect(service.parseTimeoutDuration("28d")).toBe(TIMEOUT_MAX_MS);
  });

  it("rejects anything under Discord's minimum", () => {
    expect(() => service.parseTimeoutDuration("30s")).toThrow(DomainError);
    expect(service.parseTimeoutDuration("1m")).toBe(TIMEOUT_MIN_MS);
  });
});

describe("staff warning format is unchanged by the shared composer", () => {
  it("keeps the exact Staff Warn layout", () => {
    const content = formatStaffWarningMessage({
      level: 1,
      targetId: "111111111111111111",
      reason: "سبب",
      evidence: ["https://cdn.example/a.png"],
      category: "STAFF",
    });

    expect(content.split("\n")).toEqual([
      "**Staff Warn 1 <:Attention:1486103485756870726>**",
      "**منشن : <@111111111111111111>**",
      "**السبب : سبب**",
      "**الدليل : https://cdn.example/a.png**",
    ]);
  });

  it("keeps the exact Owner Warn layout", () => {
    const content = formatStaffWarningMessage({
      level: 2,
      targetId: "111111111111111111",
      reason: "سبب",
      evidence: [],
      category: "OWNER",
    });

    expect(content.split("\n")[0]).toBe("**Owner Warn 2 <:Attention:1486103485756870726>**");
    expect(content.split("\n")).toHaveLength(4);
  });

  it("keeps the verbal layout", () => {
    const content = formatVerbalStaffWarningMessage({
      targetId: "111111111111111111",
      reason: "سبب",
      evidence: [],
      category: "OWNER",
    });
    expect(content.split("\n")[0]).toBe("**Owner Warn شفوي <:Attention:1486103485756870726>**");
  });

  it("still trims proof to fit the 2000-character cap", () => {
    const long = Array.from({ length: 60 }, (_, i) => `https://cdn.example/${"x".repeat(40)}${i}.png`);
    const content = formatStaffWarningMessage({
      level: 1,
      targetId: "111111111111111111",
      reason: "سبب",
      evidence: long,
    });

    expect(content.length).toBeLessThanOrEqual(2000);
    expect(content).toContain("…");
  });
});
