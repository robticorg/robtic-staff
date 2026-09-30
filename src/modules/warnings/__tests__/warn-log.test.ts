import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { warningMessages } from "../../../data/messages/warnings.ts";
import { buildWarnLogCard, warnLogContent } from "../render/warn-log.ts";

const labels = (fields: { label: string }[]) => fields.map((f) => f.label);

describe("warning log", () => {
  it("renders a community user warning without a type or level field", () => {
    const log = warnLogContent({
      kind: "USER",
      targetId: "111",
      issuerId: "222",
      reason: "spamming",
      evidence: [],
      warningId: "abc123",
    });

    expect(log.title).toContain(warningMessages.log.titleUser);
    expect(labels(log.fields)).toContain(warningMessages.log.reason);
    expect(labels(log.fields)).toContain(warningMessages.log.warnId);
    expect(labels(log.fields)).not.toContain(warningMessages.log.warnType);
    expect(labels(log.fields)).not.toContain(warningMessages.log.level);
  });

  it("renders a verbal staff warning tagged as تحذير شفوي", () => {
    const log = warnLogContent({
      kind: "VERBAL",
      targetId: "111",
      issuerId: "222",
      reason: "تأخر بالرد",
      evidence: [],
      warningId: "v1",
    });

    expect(log.title).toContain(warningMessages.log.titleVerbal);
    expect(log.fields.find((f) => f.label === warningMessages.log.warnType)?.value).toBe("تحذير شفوي");
  });

  it("renders a real staff warning with level + converted count", () => {
    const log = warnLogContent({
      kind: "REAL",
      targetId: "111",
      issuerId: "SYSTEM",
      reason: "تحويل تلقائي",
      level: 2,
      convertedFrom: 3,
      evidence: [],
      warningId: "r2",
    });

    expect(log.title).toContain(warningMessages.log.titleReal);
    expect(log.tone).toBe("error");
    expect(log.fields.find((f) => f.label === warningMessages.log.warnType)?.value).toBe("تحذير رسمي");
    expect(log.fields.find((f) => f.label === warningMessages.log.level)?.value).toBe("التحذير الثاني");
    expect(log.fields.find((f) => f.label === warningMessages.log.convertedFrom)?.value).toBe("3");
  });

  it("is sent as a Components V2 card, not an embed", () => {
    const message = buildWarnLogCard({
      kind: "USER",
      targetId: "111",
      issuerId: "222",
      reason: "spamming",
      evidence: ["https://x/proof.png"],
      warningId: "abc123",
    });
    expect(message.embeds).toBeUndefined();
    expect(() => (message.components as ContainerBuilder[]).map((c) => c.toJSON())).not.toThrow();
  });
});
