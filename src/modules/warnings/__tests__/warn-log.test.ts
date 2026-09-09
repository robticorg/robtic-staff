import { describe, expect, it } from "bun:test";
import { warningMessages } from "../../../data/messages/warnings.ts";
import { buildWarnLogEmbed } from "../render/warn-log.ts";

describe("buildWarnLogEmbed", () => {
  it("renders a community user warning without a type or level field", () => {
    const embed = buildWarnLogEmbed({
      kind: "USER",
      targetId: "111",
      issuerId: "222",
      reason: "spamming",
      evidence: [],
      warningId: "abc123",
    }).toJSON();

    expect(embed.title).toBe(warningMessages.log.titleUser);
    const names = (embed.fields ?? []).map((f) => f.name);
    expect(names).toContain(warningMessages.log.reason);
    expect(names).toContain(warningMessages.log.warnId);
    expect(names).not.toContain(warningMessages.log.warnType);
    expect(names).not.toContain(warningMessages.log.level);
  });

  it("renders a verbal staff warning tagged as تحذير شفوي", () => {
    const embed = buildWarnLogEmbed({
      kind: "VERBAL",
      targetId: "111",
      issuerId: "222",
      reason: "تأخر بالرد",
      evidence: [],
      warningId: "v1",
    }).toJSON();

    expect(embed.title).toBe(warningMessages.log.titleVerbal);
    const type = (embed.fields ?? []).find((f) => f.name === warningMessages.log.warnType);
    expect(type?.value).toBe("تحذير شفوي");
  });

  it("renders a real staff warning with level + converted count", () => {
    const embed = buildWarnLogEmbed({
      kind: "REAL",
      targetId: "111",
      issuerId: "SYSTEM",
      reason: "تحويل تلقائي",
      level: 2,
      convertedFrom: 3,
      evidence: [],
      warningId: "r2",
    }).toJSON();

    expect(embed.title).toBe(warningMessages.log.titleReal);
    const fields = embed.fields ?? [];
    expect(fields.find((f) => f.name === warningMessages.log.warnType)?.value).toBe("تحذير رسمي");
    expect(fields.find((f) => f.name === warningMessages.log.level)?.value).toBe("التحذير الثاني");
    expect(fields.find((f) => f.name === warningMessages.log.convertedFrom)?.value).toBe("3");
  });
});
