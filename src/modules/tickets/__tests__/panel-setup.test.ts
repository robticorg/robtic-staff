import { afterEach, describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { clearPanelOverrides, getPanel, listPublicPanels, setPanelOverride } from "../../../data/tickets/index.ts";
import { RESPONSIBILITY_APPLY_PANEL_ID } from "../../../data/tickets/panels/responsibility-apply.ts";
import { buildManageCard, buildGiveModal, buildTakeModal } from "../../responsibilities/render/manage.ts";
import { ResponsibilityCategory } from "../../responsibilities/types/enums.ts";
import { buildSendModal, buildSetupModal } from "../panel-config/render.ts";
import { applicationAnswers, validateApplication } from "../responsibility-apply/answers.ts";
import { buildResponsibilityApplyModal, buildResponsibilityApplyPanel } from "../responsibility-apply/render.ts";
import { decideClaimEligibility } from "../services/ticket-permissions.ts";
import { TicketStatus } from "../types/enums.ts";

type Json = { type: number; custom_id?: string; required?: boolean; options?: unknown[]; component?: Json; components?: Json[] };
const flat = (n: Json): Json[] => [n, ...(n.component ? flat(n.component) : []), ...(n.components ?? []).flatMap(flat)];
const modalFields = (modal: { toJSON(): unknown }) =>
  flat(modal.toJSON() as Json).filter((n) => n.custom_id && n.type !== undefined && n.type !== 18);

afterEach(() => clearPanelOverrides());

describe("ticket setup overrides", () => {
  it("applies the support role, manager role and category saved by /ticket setup", () => {
    setPanelOverride("support", { supportRoleId: "role-s", managerRoleId: "role-m", categoryId: "cat-1" });
    const panel = getPanel("support")!;
    expect(panel.supportRoleId).toBe("role-s");
    expect(panel.managerRoleId).toBe("role-m");
    expect(panel.categoryId).toBe("cat-1");
    expect(panel.categorySlot).toBeUndefined();
  });

  it("keeps the code values when nothing is set", () => {
    const before = getPanel("support")!;
    setPanelOverride("support", { supportRoleId: null, managerRoleId: null, categoryId: null });
    expect(getPanel("support")!.supportRoleId).toBe(before.supportRoleId);
  });

  it("keeps the responsibility panel out of the main ticket menu", () => {
    expect(listPublicPanels().some((p) => p.id === RESPONSIBILITY_APPLY_PANEL_ID)).toBe(false);
    expect(getPanel(RESPONSIBILITY_APPLY_PANEL_ID)).toBeDefined();
  });
});

describe("ticket managers", () => {
  it("cannot claim", () => {
    const decision = decideClaimEligibility({
      memberHasSupportRole: true,
      memberIsManager: true,
      memberIsAdministrator: false,
      memberIsOwner: false,
      claimer: { supportRoleCanClaim: true, managersCanClaim: true, onlyOnce: true, transferable: true },
      ticketStatus: TicketStatus.OPEN,
      alreadyClaimed: false,
    });
    expect(decision).toEqual({ ok: false, reason: "IS_MANAGER" });
  });
});

describe("/ticket setup and /ticket send forms", () => {
  it("setup asks for the ticket type, support role, optional manager role, category and optional log channel", () => {
    const fields = modalFields(buildSetupModal([{ id: "support", name: "الدعم", description: "x" }]));
    expect(fields.map((f) => f.custom_id)).toEqual(["type", "support", "manager", "category", "log"]);
    expect(fields.find((f) => f.custom_id === "manager")?.required).toBe(false);
  });

  it("send asks for the panel, the channel and the optional responsibility panel text", () => {
    const fields = modalFields(buildSendModal());
    expect(fields.map((f) => f.custom_id)).toEqual(["panel", "channel", "title", "description", "image"]);
  });
});

describe("responsibility application", () => {
  const responsibilities = [{ responsibilityId: "r1", title: "مسؤول الهدايا", description: "تسليم الهدايا" }];

  it("posts a Components V2 panel with one button, using custom text when given", () => {
    const panel = buildResponsibilityApplyPanel({ title: "قدّم الحين", description: "وصف", image: null });
    const nodes = (panel.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
    expect(nodes.filter((n) => n.type === 2)).toHaveLength(1);
    expect(JSON.stringify(panel.components!.map((c) => (c as ContainerBuilder).toJSON()))).toContain("قدّم الحين");
  });

  it("asks for the responsibility, three answers and the commitment checkbox", () => {
    const fields = modalFields(buildResponsibilityApplyModal(responsibilities));
    expect(fields.map((f) => f.custom_id)).toEqual(["responsibility", "explain", "job", "situation", "commit"]);
  });

  it("refuses an application without the commitment or with empty answers", () => {
    const base = { responsibilityTitle: "مسؤول الهدايا", explain: "a", job: "b", situation: "c", committed: true };
    expect(validateApplication(base)).toBeNull();
    expect(validateApplication({ ...base, committed: false })).toBe("NOT_COMMITTED");
    expect(validateApplication({ ...base, job: "  " })).toBe("MISSING_FIELDS");
  });

  it("turns the answers into the ticket's answer list in order", () => {
    const answers = applicationAnswers({
      responsibilityTitle: "مسؤول الهدايا",
      explain: "شرح",
      job: "وظيفة",
      situation: "موقف",
      committed: true,
    });
    expect(answers.map((a) => a.questionId)).toEqual(["responsibility", "explain", "job", "situation", "commit"]);
    expect(answers[0]!.answer).toBe("مسؤول الهدايا");
  });
});

describe("!مسؤولية give / remove", () => {
  const rows = [
    { responsibilityId: "r1", title: "A", description: "a", category: ResponsibilityCategory.STAFF },
    { responsibilityId: "r2", title: "B", description: "b", category: ResponsibilityCategory.OTHER },
  ];

  it("shows two buttons for the command author", () => {
    const card = buildManageCard("staff1", "user1");
    const nodes = (card.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
    expect(nodes.filter((n) => n.type === 2).map((n) => n.custom_id)).toEqual([
      "resp:give:staff1:user1",
      "resp:take:staff1:user1",
    ]);
  });

  it("lists only the given responsibilities in each form", () => {
    const give = flat(buildGiveModal("staff1", "user1", rows).toJSON() as unknown as Json).find((n) => n.type === 3)!;
    expect(give.options).toHaveLength(2);
    const take = flat(
      buildTakeModal("staff1", "user1", [{ assignmentId: "as1", responsibility: rows[0]! }]).toJSON() as unknown as Json,
    ).find((n) => n.type === 3)!;
    expect(take.options).toHaveLength(1);
  });
});
