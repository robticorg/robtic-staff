import { describe, expect, it } from "bun:test";
import { staffMessages } from "../../../data/messages/staff.ts";
import { buildComeDm } from "../render/come-dm.ts";

const dm = buildComeDm({
  callerId: "caller",
  reason: "اجتماع الستاف",
  guildId: "g1",
  channelId: "c1",
  messageId: "m1",
});

describe("come DM", () => {
  it("uses the exact wording with the caller mention and the reason", () => {
    expect(dm.content).toBe("لقد تم ندائك بواسطة <@caller> للحضور بسبب : اجتماع الستاف");
  });

  it("is plain text, not an embed", () => {
    expect(dm.embeds ?? []).toHaveLength(0);
  });

  it("links straight to the message the command was typed in", () => {
    const row = dm.components?.[0] as unknown as {
      components: { data: Record<string, unknown> }[];
    };
    expect(row.components[0]!.data.url).toBe("https://discord.com/channels/g1/c1/m1");
    expect(row.components[0]!.data.label).toBe(staffMessages.come.dm.button);
  });

  it("suppresses mention pings — the DM should not ring the caller", () => {
    expect(dm.allowedMentions).toEqual({ parse: [] });
  });
});
