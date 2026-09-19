import { describe, expect, it } from "bun:test";
import { buildPunishmentLog } from "../render/log.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { PunishmentStatus, PunishmentType } from "../types/enums.ts";

const base = {
  punishmentId: "abc123",
  guildId: "g",
  userId: "111111111111111111",
  status: PunishmentStatus.EXECUTED,
  reason: "سبب",
  evidence: [] as string[],
  issuedBy: "222222222222222222",
} as unknown as Punishment;

describe("punishment log — the only place a timeout or jail appears", () => {
  it("carries the duration for a timeout", () => {
    const content = buildPunishmentLog({
      ...base,
      type: PunishmentType.TIMEOUT,
      duration: 3_600_000,
    } as Punishment);

    expect(content).toContain("**المدة:** 1h");
  });

  it("omits the duration line when there is none", () => {
    expect(buildPunishmentLog({ ...base, type: PunishmentType.JAIL } as Punishment)).not.toContain(
      "المدة",
    );
  });

  it("carries the evidence the moderator uploaded", () => {
    const content = buildPunishmentLog({
      ...base,
      type: PunishmentType.JAIL,
      evidence: ["https://cdn.example/a.png", "https://cdn.example/b.png"],
    } as Punishment);

    expect(content).toContain("https://cdn.example/a.png");
    expect(content).toContain("https://cdn.example/b.png");
  });

  it("omits the evidence line when there is none", () => {
    expect(buildPunishmentLog({ ...base, type: PunishmentType.JAIL } as Punishment)).not.toContain(
      "الدليل",
    );
  });

  it("still reports target, type, reason and issuer", () => {
    const content = buildPunishmentLog({ ...base, type: PunishmentType.JAIL } as Punishment);

    expect(content).toContain("111111111111111111");
    expect(content).toContain("سجن");
    expect(content).toContain("**السبب:** سبب");
    expect(content).toContain("<@222222222222222222>");
  });
});
