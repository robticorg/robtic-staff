import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { Guild } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { LeadAssignmentModel } from "../models/lead-assignment.model.ts";
import { LeadModel } from "../models/lead.model.ts";
import { leadAssignmentService } from "../services/lead-assignment.service.ts";
import { leadService } from "../services/lead.service.ts";
import { LeadError } from "../shared/lead-error.ts";
import { LeadAssignmentStatus, LeadHolderType, LeadTargetType } from "../types/enums.ts";

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

const GUILD = "lead-itest-guild";
const guild = { id: GUILD, client: { user: { id: "bot" } } } as unknown as Guild;
const user = (id: string) => ({ type: LeadHolderType.USER, id });

async function createLead(name = "مسؤول الطاقم الاداري") {
  return leadService.createLead({
    guild,
    name,
    description: "وصف",
    target: { type: LeadTargetType.ROLE, id: "staff-role" },
    createdBy: "admin",
  });
}

describe.skipIf(!hasDb)("lead assignments (MongoDB)", () => {
  beforeEach(async () => {
    await LeadModel.deleteMany({ guildId: GUILD });
    await LeadAssignmentModel.deleteMany({ guildId: GUILD });
  });

  afterAll(async () => {
    if (!hasDb) return;
    await LeadModel.deleteMany({ guildId: GUILD });
    await LeadAssignmentModel.deleteMany({ guildId: GUILD });
    await mongoose.disconnect();
  });

  it("rejects duplicate names and @everyone targets", async () => {
    await createLead();
    await expect(createLead()).rejects.toBeInstanceOf(LeadError);
    await expect(
      leadService.createLead({
        guild,
        name: "x",
        description: "y",
        target: { type: LeadTargetType.ROLE, id: GUILD },
        createdBy: "admin",
      }),
    ).rejects.toBeInstanceOf(LeadError);
  });

  it("never overwrites silently and keeps history on replace", async () => {
    const lead = await createLead();
    const base = { guild, leadId: lead.leadId, actorId: "admin" };

    expect((await leadAssignmentService.assignLead({ ...base, holder: user("a"), replace: false })).kind).toBe("ASSIGNED");
    await expect(leadAssignmentService.assignLead({ ...base, holder: user("b"), replace: false })).rejects.toBeInstanceOf(
      LeadError,
    );
    await expect(leadAssignmentService.assignLead({ ...base, holder: user("a"), replace: true })).rejects.toBeInstanceOf(
      LeadError,
    );

    const replaced = await leadAssignmentService.assignLead({ ...base, holder: user("b"), replace: true });
    expect(replaced.kind).toBe("REPLACED");
    expect(replaced.assignment.previousHolderId).toBe("a");
    expect((await leadAssignmentService.currentHolder(GUILD, lead.leadId))?.holderId).toBe("b");

    const history = await leadAssignmentService.history(GUILD, lead.leadId);
    expect(history.map((h) => h.status).sort()).toEqual([LeadAssignmentStatus.ACTIVE, LeadAssignmentStatus.REPLACED]);
  });

  it("removes the holder and refuses to remove twice", async () => {
    const lead = await createLead();
    await leadAssignmentService.assignLead({ guild, leadId: lead.leadId, holder: user("a"), replace: false, actorId: "admin" });
    const removed = await leadAssignmentService.removeLead({ guild, leadId: lead.leadId, actorId: "admin" });
    expect(removed.status).toBe(LeadAssignmentStatus.REMOVED);
    await expect(leadAssignmentService.removeLead({ guild, leadId: lead.leadId, actorId: "admin" })).rejects.toBeInstanceOf(
      LeadError,
    );
  });

  it("does not see leads from another guild", async () => {
    const lead = await createLead();
    await expect(leadService.requireLead("other-guild", lead.leadId)).rejects.toBeInstanceOf(LeadError);
  });
});
