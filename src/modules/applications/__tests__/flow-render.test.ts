import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { buildFirstModal } from "../render/first-modal.ts";
import { flowReply } from "../render/flow-message.ts";
import {
  applyIntroStep,
  buildEvidenceModal,
  buildTransferInfoModal,
  departmentStep,
  evidenceStep,
  genderStep,
  statusStep,
  transferIntroStep,
} from "../render/flow-steps.ts";

// discord.js validates lengths when a builder is serialised — the same moment it
// would throw while replying to a member. An invalid step means nobody can apply.
const toJSON = (input: Parameters<typeof flowReply>[0]) =>
  (flowReply(input).components as ContainerBuilder[]).map((c) => c.toJSON());

describe("application flow renders for Discord", () => {
  const steps = {
    applyIntro: applyIntroStep(),
    gender: genderStep(),
    departmentBoy: departmentStep(false),
    departmentGirl: departmentStep(true),
    transferIntro: transferIntroStep(),
    evidence: evidenceStep(null),
  };

  for (const [name, step] of Object.entries(steps)) {
    it(`${name} step is valid`, () => {
      expect(() => toJSON(step)).not.toThrow();
    });
  }

  it("skips empty text blocks instead of failing", () => {
    expect(() => toJSON(statusStep(""))).not.toThrow();
    expect(() => toJSON({ blocks: ["a", "", "   ", "b"] })).not.toThrow();
  });

  it("every modal is valid", () => {
    expect(() => buildFirstModal().toJSON()).not.toThrow();
    expect(() => buildTransferInfoModal().toJSON()).not.toThrow();
    expect(() => buildEvidenceModal().toJSON()).not.toThrow();
  });
});
