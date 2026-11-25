import { describe, expect, it } from "bun:test";
import { buildLeadViews, resolveLeads } from "../services/lead-resolution.service.ts";
import { LeadHolderType, LeadTargetType } from "../types/enums.ts";

const lead = (leadId: string, targetType: LeadTargetType, targetId: string) => ({
  leadId,
  name: leadId,
  targetType,
  targetId,
});
const holder = (leadId: string, holderType: LeadHolderType, holderId: string) => ({ leadId, holderType, holderId });

const views = buildLeadViews(
  [
    lead("byUser", LeadTargetType.USER, "u1"),
    lead("byRole", LeadTargetType.ROLE, "r1"),
    lead("byResp", LeadTargetType.RESPONSIBILITY, "resp1"),
    lead("byRole2", LeadTargetType.ROLE, "r2"),
    lead("empty", LeadTargetType.ROLE, "r1"),
  ],
  [
    holder("byUser", LeadHolderType.USER, "boss"),
    holder("byRole", LeadHolderType.ROLE, "bossRole"),
    holder("byResp", LeadHolderType.USER, "respBoss"),
    holder("byRole2", LeadHolderType.USER, "u1"),
  ],
);

const names = (list: { name: string }[]) => list.map((v) => v.name).sort();

describe("resolveLeads", () => {
  it("matches user and role targets; old responsibility targets match no one", () => {
    const result = resolveLeads(views, { userId: "u1", roleIds: ["r1"] });
    expect(names(result.leadsOf)).toEqual(["byRole", "byUser"]);
  });

  it("returns nothing when no lead matches and never invents one", () => {
    const result = resolveLeads(views, { userId: "x", roleIds: [] });
    expect(result.leadsOf).toEqual([]);
    expect(result.leading).toEqual([]);
  });

  it("skips leads without a holder", () => {
    const result = resolveLeads(views, { userId: "x", roleIds: ["r1"] });
    expect(names(result.leadsOf)).toEqual(["byRole"]);
  });

  it("excludes leads the member holds themselves and lists them as leading", () => {
    const self = resolveLeads(views, { userId: "u1", roleIds: ["r2"] });
    expect(names(self.leadsOf)).toEqual(["byUser"]);
    expect(names(self.leading)).toEqual(["byRole2"]);

    const viaRole = resolveLeads(views, { userId: "z", roleIds: ["bossRole", "r1"] });
    expect(viaRole.leadsOf).toEqual([]);
    expect(names(viaRole.leading)).toEqual(["byRole"]);
  });
});
