import { describe, expect, it } from "bun:test";
import { StaffApplicationWorkflow, staffApplicationPanel, staffTransferApplicationPanel } from "../../../data/staff-application/panels.ts";
import { formatMembershipDuration } from "../../../data/staff-application/messages.ts";
import { getPanel, listPublicPanels } from "../../../data/tickets/index.ts";
import { FastAccessContext, RoleConfigType } from "../../configuration/types/enums.ts";
import { buildApplicationPanel } from "../render/application-panel.ts";
import { applicationInfoLines } from "../render/application-info.ts";
import { buildFirstModal } from "../render/first-modal.ts";
import { managerSlotsFor } from "../services/application-permission.service.ts";
import { isEligibleRecruiter } from "../services/staff-recruitment.service.ts";
import { parseApplicantIdentity, parseWholeNumber } from "../shared/applicant-input.ts";
import {
  ApplicantGender,
  ApplicationDepartment,
  ApplicationStatus,
  ApplicationType,
  GirlVerificationStatus,
} from "../shared/enums.ts";
import { parseTransferInfo } from "../transfer/staff-transfer-application.service.ts";
import { checkEvidence } from "../transfer/transfer-evidence.service.ts";

describe("main ticket panel entry", () => {
  it("is an option of the existing ticket menu, the transfer ticket type is not", () => {
    const publicIds = listPublicPanels().map((p) => p.id);
    expect(publicIds).toContain(StaffApplicationWorkflow.STAFF_APPLICATION);
    expect(publicIds).not.toContain(StaffApplicationWorkflow.STAFF_TRANSFER_APPLICATION);
    expect(getPanel(StaffApplicationWorkflow.STAFF_TRANSFER_APPLICATION)).toBe(
      staffTransferApplicationPanel,
    );
    expect(staffApplicationPanel.name).toBe("التقديم أو النقل إلى الستاف");
  });

  it("gates both application tickets by the staff blacklist, not the ticket blacklist", () => {
    expect(staffApplicationPanel.blacklistSlot).toBe(RoleConfigType.BLACKLIST);
    expect(staffTransferApplicationPanel.blacklistSlot).toBe(RoleConfigType.BLACKLIST);
    expect(getPanel("gift-claim")?.blacklistSlot).toBe(RoleConfigType.GIFT_BLACKLIST);
  });

  it("runs dedicated Fast Access contexts", () => {
    expect(staffApplicationPanel.fastAccessContext).toBe(FastAccessContext.STAFF_APPLICATION);
    expect(staffTransferApplicationPanel.fastAccessContext).toBe(FastAccessContext.STAFF_TRANSFER);
  });
});

describe("first modal", () => {
  const json = buildFirstModal().toJSON() as unknown as {
    components: { type: number; label: string; component: { type: number; custom_id: string; required?: boolean; min_values?: number; max_values?: number } }[];
  };

  it("carries identity, type, the optional recruiter picker and the terms checkbox together", () => {
    expect(json.components.map((c) => c.label)).toEqual([
      "الاسم والعمر والمدينة",
      "نوع الطلب",
      "مين عرفك على الفريق؟",
      "أوافق على قوانين وشروط الستاف.",
    ]);
  });

  it("uses Discord's native user select for the recruiter, optional, single choice", () => {
    const recruiter = json.components[2]!.component;
    expect(recruiter.type).toBe(5);
    expect(recruiter.required).toBe(false);
    expect(recruiter.min_values).toBe(0);
    expect(recruiter.max_values).toBe(1);
  });
});

describe("applicant identity input", () => {
  it("reads name, age and city from separate lines", () => {
    expect(parseApplicantIdentity("Ahmed\n19\nBlida")).toEqual({
      ok: true,
      name: "Ahmed",
      age: 19,
      city: "Blida",
    });
    expect(parseApplicantIdentity("أحمد، ١٩، الرياض")).toEqual({
      ok: true,
      name: "أحمد",
      age: 19,
      city: "الرياض",
    });
  });

  it("rejects a missing part or a non-numeric age", () => {
    expect(parseApplicantIdentity("Ahmed\n19")).toEqual({ ok: false, problem: "SHAPE" });
    expect(parseApplicantIdentity("Ahmed\nnineteen\nBlida")).toEqual({ ok: false, problem: "AGE" });
    expect(parseApplicantIdentity("Ahmed\n400\nBlida")).toEqual({ ok: false, problem: "AGE" });
  });

  it("reads whole numbers with separators and Arabic digits", () => {
    expect(parseWholeNumber("12,000")).toBe(12000);
    expect(parseWholeNumber("٤٠٠٠")).toBe(4000);
    expect(parseWholeNumber("Owner")).toBeNull();
    expect(parseWholeNumber("-3")).toBeNull();
  });
});

describe("transfer information", () => {
  const base = { memberCount: "12000", onlineCount: "1500", roleOrder: "4", invite: "" };

  it("accepts numeric counts and role order", () => {
    expect(parseTransferInfo(base)).toEqual({
      ok: true,
      value: { memberCount: 12000, onlineCount: 1500, roleOrder: 4, invite: null },
    });
  });

  it("refuses a role name in place of the role order", () => {
    for (const roleOrder of ["Owner", "Admin", "Manager", "0", "4th"]) {
      expect(parseTransferInfo({ ...base, roleOrder })).toEqual({ ok: false, problem: "ROLE_ORDER" });
    }
  });

  it("refuses non-numeric counts and more online than members", () => {
    expect(parseTransferInfo({ ...base, memberCount: "lots" })).toEqual({ ok: false, problem: "COUNT" });
    expect(parseTransferInfo({ ...base, onlineCount: "20000" })).toEqual({
      ok: false,
      problem: "ONLINE_ABOVE_MEMBERS",
    });
  });

  it("validates the evidence set before anything is downloaded", () => {
    const image = { name: "a.png", url: "https://x", contentType: "image/png", size: 1000 };
    expect(checkEvidence([image, image, image])).toBe("TOO_FEW");
    expect(checkEvidence([image, image, image, image])).toBeNull();
    expect(checkEvidence([image, image, image, { ...image, contentType: "application/pdf" }])).toBe(
      "NOT_IMAGE",
    );
    expect(checkEvidence([image, image, image, { ...image, size: 50 * 1024 * 1024 }])).toBe(
      "TOO_LARGE",
    );
  });
});

describe("manager routing", () => {
  const route = (department: ApplicationDepartment | null, gender: ApplicantGender | null = null) =>
    managerSlotsFor({ type: ApplicationType.NORMAL_APPLICATION, department, gender });

  it("sends each department to its manager, falling back to the Apply Manager", () => {
    expect(route(ApplicationDepartment.STAFF)).toEqual({
      primary: RoleConfigType.APPLY_MANAGER,
      fallback: null,
      girls: false,
    });
    expect(route(ApplicationDepartment.DEVELOPER)).toEqual({
      primary: RoleConfigType.DEVELOPER_MANAGER,
      fallback: RoleConfigType.APPLY_MANAGER,
      girls: false,
    });
    expect(route(ApplicationDepartment.DESIGNER).primary).toBe(RoleConfigType.DESIGNER_MANAGER);
    expect(route(ApplicationDepartment.EDITOR).primary).toBe(RoleConfigType.EDITOR_MANAGER);
  });

  it("adds the Girls Manager for a girl's application", () => {
    expect(route(ApplicationDepartment.STAFF, ApplicantGender.FEMALE).girls).toBe(true);
    expect(route(ApplicationDepartment.STAFF, ApplicantGender.MALE).girls).toBe(false);
  });

  it("sends transfers to the Transfer Manager only", () => {
    expect(
      managerSlotsFor({ type: ApplicationType.TRANSFER_APPLICATION, department: null, gender: null }),
    ).toEqual({ primary: RoleConfigType.TRANSFER_MANAGER, fallback: null, girls: false });
  });
});

describe("recruiter eligibility", () => {
  it("requires Owner or above", () => {
    expect(isEligibleRecruiter({ recruiterLevel: 6, minimumTierStart: 6 })).toBe(true);
    expect(isEligibleRecruiter({ recruiterLevel: 9, minimumTierStart: 6 })).toBe(true);
    expect(isEligibleRecruiter({ recruiterLevel: 5, minimumTierStart: 6 })).toBe(false);
    expect(isEligibleRecruiter({ recruiterLevel: null, minimumTierStart: 6 })).toBe(false);
    expect(isEligibleRecruiter({ recruiterLevel: 9, minimumTierStart: null })).toBe(false);
  });
});

describe("application ticket panel and information", () => {
  const application = {
    applicationId: "app1",
    userId: "111111111111111111",
    type: ApplicationType.NORMAL_APPLICATION,
    department: ApplicationDepartment.DEVELOPER,
    gender: ApplicantGender.FEMALE,
    evaluation: null,
    applicationStatus: ApplicationStatus.PENDING,
  };

  it("offers Close, Options and Information and mentions the managers", () => {
    const card = buildApplicationPanel("ticket-9", application, ["222", "333"]);
    const text = JSON.stringify(card.components?.map((c) => ("toJSON" in c ? c.toJSON() : c)));
    expect(text).toContain("tk:optClose:ticket-9");
    expect(text).toContain("tk:options:ticket-9");
    expect(text).toContain("ap:info:app1");
    expect(text).toContain("<@&222> <@&333>");
    expect(text).toContain("بانتظار أحد المسؤولين لاستلام الطلب");
  });

  it("shows a normal application's details with the recruiter", () => {
    const lines = applicationInfoLines({
      type: ApplicationType.NORMAL_APPLICATION,
      name: "سارة",
      age: 20,
      city: "جدة",
      gender: ApplicantGender.FEMALE,
      department: ApplicationDepartment.DESIGNER,
      girlVerification: GirlVerificationStatus.PENDING,
      recruiterStaffId: "444444444444444444",
      transfer: null,
      evaluation: null,
      evidenceCount: 0,
      robticJoinedAt: null,
      applicationStatus: ApplicationStatus.CLAIMED,
    });
    expect(lines).toContain("**الاسم:** سارة");
    expect(lines).toContain("**المجال:** مصمم");
    expect(lines).toContain("**حالة التحقق:** بانتظار التوثيق");
    expect(lines).toContain("**مين عرفه على الفريق:** <@444444444444444444>");
  });

  it("shows a transfer's source numbers, membership, proposal and evidence count", () => {
    const now = new Date("2026-09-27T00:00:00Z");
    const lines = applicationInfoLines(
      {
        type: ApplicationType.TRANSFER_APPLICATION,
        name: "Ahmed",
        age: 19,
        city: "Blida",
        gender: null,
        department: null,
        girlVerification: null,
        recruiterStaffId: null,
        transfer: {
          sourceServerId: null,
          sourceServerName: null,
          sourceServerMemberCount: 12000,
          sourceServerOnlineCount: 1500,
          sourceRoleOrder: 4,
          sourceRoleName: null,
          sourceRoleId: null,
          countsVerified: false,
        },
        evaluation: {
          eligible: true,
          ineligibleReasons: [],
          sourceTier: "OWNER",
          proposedTier: "STAFF",
          proposedStaffLevel: 3,
          proposedStaffRoleId: "555",
        },
        evidenceCount: 5,
        robticJoinedAt: new Date("2026-01-27T00:00:00Z"),
        applicationStatus: ApplicationStatus.PENDING,
      },
      now,
    );
    expect(lines).toContain("**عدد أعضاء السيرفر:** 12,000");
    expect(lines).toContain("**ترتيب الرتبة:** 4");
    expect(lines).toContain(`**مدة وجوده في RobTic:** ${formatMembershipDuration(243)}`);
    expect(lines).toContain("**الرتبة المتوقعة:** <@&555> (المستوى 3)");
    expect(lines).toContain("**عدد الإثباتات:** 5");
    expect(lines).toContain("**مين عرفه على الفريق:** ما فيه");
  });
});
