import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { FaqModel } from "../models/faq.model.ts";
import { faqService } from "../services/faq.service.ts";

let hasDb = false;
try {
  await mongoose.connect(config.mongoUri, {
    dbName: `${config.mongoDbName}_test`,
    serverSelectionTimeoutMS: 1500,
  });
  hasDb = true;
} catch {
  hasDb = false;
}

const GUILD = "faq-scope-itest-guild";

async function cleanup(): Promise<void> {
  await FaqModel.deleteMany({ guildId: GUILD });
}

describe.skipIf(!hasDb)("FAQ panel scoping (MongoDB)", () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  it("a FAQ with no panelIds shows up for every panel", async () => {
    await faqService.add({ guildId: GUILD, question: "q1", answer: "a1", createdBy: "u1" });

    const forSupport = await faqService.list(GUILD, "support");
    const forMinecraft = await faqService.list(GUILD, "minecraft");
    expect(forSupport.map((f) => f.question)).toEqual(["q1"]);
    expect(forMinecraft.map((f) => f.question)).toEqual(["q1"]);
  });

  it("a FAQ scoped to one panel only shows up there", async () => {
    await faqService.add({
      guildId: GUILD,
      question: "q2",
      answer: "a2",
      createdBy: "u1",
      panelIds: ["support"],
    });

    expect((await faqService.list(GUILD, "support")).map((f) => f.question)).toEqual(["q2"]);
    expect((await faqService.list(GUILD, "minecraft")).map((f) => f.question)).toEqual([]);

    expect((await faqService.list(GUILD)).map((f) => f.question)).toEqual(["q2"]);
  });

  it("assignPanel() switches an existing FAQ's scope, and clears it back to all with null", async () => {
    const faq = await faqService.add({ guildId: GUILD, question: "q3", answer: "a3", createdBy: "u1" });

    await faqService.assignPanel(GUILD, faq.faqId, "support");
    expect((await faqService.list(GUILD, "support")).map((f) => f.question)).toEqual(["q3"]);
    expect((await faqService.list(GUILD, "minecraft")).map((f) => f.question)).toEqual([]);

    await faqService.assignPanel(GUILD, faq.faqId, null);
    expect((await faqService.list(GUILD, "minecraft")).map((f) => f.question)).toEqual(["q3"]);
  });
});
