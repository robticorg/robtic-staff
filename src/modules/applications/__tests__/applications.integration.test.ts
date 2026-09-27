import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { staffApplicationConfig } from "../../../data/staff-application/config.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { FastAccessModel } from "../../configuration/models/fast-access.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { fastAccessService } from "../../configuration/services/fast-access.service.ts";
import { FastAccessContext, RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";
import { invalidateStaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import { fastAccessRunner } from "../../fast-access/fast-access-runner.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffHistoryModel } from "../../staff/models/staff-history.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import { StaffPointTransactionType, StaffStatus } from "../../staff/types/enums.ts";
import { TicketModel } from "../../tickets/models/ticket.model.ts";
import { ticketService } from "../../tickets/services/ticket.service.ts";
import { TicketStatus } from "../../tickets/types/enums.ts";
import { staffApplicationService } from "../application/staff-application.service.ts";
import { applicationContextService } from "../services/application-context.service.ts";
import { applicationDecisionService } from "../services/application-decision.service.ts";
import { registerApplicationLifecycle } from "../services/application-lifecycle.ts";
import { girlVerificationService } from "../services/girl-verification.service.ts";
import { staffRecruitmentService } from "../services/staff-recruitment.service.ts";
import { ApplicationEvidenceModel } from "../shared/application-evidence.model.ts";
import type { ApplicationDraft } from "../shared/application-draft.store.ts";
import {
  ApplicantGender,
  ApplicationDepartment,
  ApplicationStatus,
  ApplicationType,
  GirlVerificationStatus,
} from "../shared/enums.ts";
import { StaffApplicationModel } from "../shared/staff-application.model.ts";
import { staffTransferApplicationService } from "../transfer/staff-transfer-application.service.ts";
import { addMember, makeGuild, type FakeGuild, type FakeMember } from "./fake-guild.ts";

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

const GUILD = "apps-itest-guild";
const LADDER = ["lvl-0", "lvl-1", "lvl-2", "lvl-3"];
const APPLY = "apply-manager";
const TRANSFER = "transfer-manager";
const GIRLS = "girls-manager";
const GIRL_NOT_VERIFIED = "girl-not-verified";
const GIRL_VERIFIED = "girl-verified";
const STAFF_BLACKLIST = "staff-blacklist";
const ALL_ROLES = [...LADDER, APPLY, TRANSFER, GIRLS, GIRL_NOT_VERIFIED, GIRL_VERIFIED, STAFF_BLACKLIST];
const CATEGORIES = [staffApplicationConfig.applicationCategoryId, staffApplicationConfig.transferCategoryId];

let guild: FakeGuild;
let owner: FakeMember;
let highStaff: FakeMember;
let manager: FakeMember;
let otherManager: FakeMember;
let admin: FakeMember;
let seq = 0;

const realFetch = globalThis.fetch;

function draft(userId: string, overrides: Partial<ApplicationDraft> = {}): ApplicationDraft {
  return {
    guildId: GUILD,
    userId,
    type: ApplicationType.NORMAL_APPLICATION,
    name: "Ahmed",
    age: 19,
    city: "Blida",
    termsAccepted: true,
    recruiterStaffId: null,
    recruiterAssignedAt: null,
    gender: ApplicantGender.MALE,
    ...overrides,
  };
}

function applicant(roles: string[] = []): FakeMember {
  seq += 1;
  return addMember(guild, `applicant-${seq}`, roles);
}

function evidence(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `proof-${i}.png`,
    url: `https://cdn.example/proof-${i}.png`,
    contentType: "image/png",
    size: 4,
  }));
}

function appFor(userId: string) {
  return StaffApplicationModel.findOne({ guildId: GUILD, userId }).sort({ createdAt: -1 }).exec();
}

async function ticketFor(userId: string) {
  const application = await appFor(userId);
  return TicketModel.findOne({ ticketId: application!.ticketId }).exec();
}

async function contextFor(userId: string) {
  const ticket = await ticketFor(userId);
  return (await applicationContextService.forChannel(GUILD, ticket!.channelId))!;
}

async function seed(): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId: GUILD });
  await roleConfigService.rebuildLadder(GUILD, LADDER);
  await roleConfigService.setBoundary(GUILD, "lvl-2", StaffTier.HIGHSTAFF);
  await roleConfigService.setBoundary(GUILD, "lvl-3", StaffTier.OWNER);
  for (const [roleId, type] of [
    [APPLY, RoleConfigType.APPLY_MANAGER],
    [TRANSFER, RoleConfigType.TRANSFER_MANAGER],
    [GIRLS, RoleConfigType.GIRLS_MANAGER],
    [GIRL_NOT_VERIFIED, RoleConfigType.GIRL_NOT_VERIFIED],
    [GIRL_VERIFIED, RoleConfigType.GIRL_VERIFIED],
    [STAFF_BLACKLIST, RoleConfigType.BLACKLIST],
  ] as const) {
    await roleConfigService.setRole({ guildId: GUILD, roleId, type });
  }
  invalidateStaffHierarchy(GUILD);
}

async function cleanup(): Promise<void> {
  await Promise.all([
    RoleConfigModel.deleteMany({ guildId: GUILD }),
    FastAccessModel.deleteMany({ guildId: GUILD }),
    StaffApplicationModel.deleteMany({ guildId: GUILD }),
    ApplicationEvidenceModel.deleteMany({ guildId: GUILD }),
    TicketModel.deleteMany({ guildId: GUILD }),
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffHistoryModel.deleteMany({}),
    StaffActivityModel.deleteMany({}),
    StaffPointTransactionModel.deleteMany({}),
  ]);
}

describe.skipIf(!hasDb)("staff applications on the ticket system (MongoDB + Discord fakes)", () => {
  beforeAll(async () => {
    await Promise.all([StaffApplicationModel.syncIndexes(), StaffPointTransactionModel.syncIndexes()]);
    await cleanup();
    await seed();
    registerApplicationLifecycle();
    globalThis.fetch = (async () => new Response(new Uint8Array([1, 2, 3, 4]))) as unknown as typeof fetch;
  });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await cleanup();
  });

  beforeEach(() => {
    guild = makeGuild(GUILD, CATEGORIES, ALL_ROLES);
    owner = addMember(guild, "owner-1", ["lvl-0", "lvl-1", "lvl-2", "lvl-3"]);
    highStaff = addMember(guild, "high-1", ["lvl-0", "lvl-1", "lvl-2"]);
    manager = addMember(guild, "manager-1", ["lvl-0", "lvl-1", "lvl-2", "lvl-3", APPLY, TRANSFER]);
    otherManager = addMember(guild, "manager-2", ["lvl-0", "lvl-1", "lvl-2", "lvl-3", APPLY]);
    admin = addMember(guild, "admin-1", [], { admin: true });
  });

  afterEach(async () => {
    await TicketModel.updateMany({ guildId: GUILD }, { $set: { status: TicketStatus.DELETED } }).exec();
  });

  describe("apply", () => {
    it("opens an application ticket with the recruiter picked in the first modal", async () => {
      const member = applicant();
      const submittedAt = new Date();
      const relationship = await staffRecruitmentService.relationshipForNewApplication(
        guild as never,
        member.id,
        owner.id,
        submittedAt,
      );

      await staffApplicationService.submit(
        guild as never,
        member as never,
        draft(member.id, {
          recruiterStaffId: relationship.recruiterStaffId,
          recruiterAssignedAt: relationship.recruiterAssignedAt ?? null,
        }),
        ApplicationDepartment.STAFF,
      );

      const application = await appFor(member.id);
      expect(application!.recruiterStaffId).toBe(owner.id);
      expect(application!.recruiterAssignedBy).toBe(member.id);
      expect(application!.recruiterAssignedAt?.getTime()).toBe(submittedAt.getTime());
      expect(application!.applicationStatus).toBe(ApplicationStatus.PENDING);
      expect(application!.department).toBe(ApplicationDepartment.STAFF);

      const ticket = await ticketFor(member.id);
      expect(ticket!.panelId).toBe("staff-application");
      expect(ticket!.claimableRoles.map((slot) => slot.roleId)).toEqual([APPLY]);

      const channel = guild.channels.byId.get(ticket!.channelId)!;
      const applyOverwrite = channel.overwrites.get(APPLY);
      expect(applyOverwrite.deny).toContain(PermissionFlagsBits.SendMessages);
      expect(applyOverwrite.allow).toContain(PermissionFlagsBits.ViewChannel);
      expect(channel.sent[0]!.payload.content).toContain(`<@&${APPLY}>`);
      expect(JSON.stringify(channel.sent.map((m) => m.payload))).toContain(`tk:roleClaim:${ticket!.ticketId}:${APPLY}`);
    });

    it("stores no recruiter when the field was left empty", async () => {
      const member = applicant();
      await staffApplicationService.submit(guild as never, member as never, draft(member.id), ApplicationDepartment.STAFF);
      const application = await appFor(member.id);
      expect(application!.recruiterStaffId).toBeNull();
      expect(application!.recruiterAssignedAt).toBeUndefined();
    });

    it("routes a girl developer to the Apply Manager fallback plus the Girls Manager and verifies her", async () => {
      const member = applicant();
      await staffApplicationService.submit(
        guild as never,
        member as never,
        draft(member.id, { gender: ApplicantGender.FEMALE }),
        ApplicationDepartment.DEVELOPER,
      );

      const ticket = await ticketFor(member.id);
      expect(ticket!.claimableRoles.map((slot) => slot.roleId)).toEqual([APPLY, GIRLS]);
      expect(member.roles.cache.has(GIRL_NOT_VERIFIED)).toBe(true);
      expect((await appFor(member.id))!.girlVerification).toBe(GirlVerificationStatus.PENDING);

      const girlsManager = addMember(guild, "girls-mgr", [GIRLS]);
      await expect(girlVerificationService.verify(otherManager as never, member as never)).rejects.toThrow();
      await girlVerificationService.verify(girlsManager as never, member as never);

      expect(member.roles.cache.has(GIRL_NOT_VERIFIED)).toBe(false);
      expect(member.roles.cache.has(GIRL_VERIFIED)).toBe(true);
      const application = await appFor(member.id);
      expect(application!.girlVerification).toBe(GirlVerificationStatus.VERIFIED);
      expect(application!.girlVerifiedBy).toBe("girls-mgr");
      expect(application!.applicationStatus).toBe(ApplicationStatus.PENDING);
    });

    it("refuses the staff blacklist and existing staff", async () => {
      const blacklisted = applicant([STAFF_BLACKLIST]);
      await expect(
        staffApplicationService.submit(guild as never, blacklisted as never, draft(blacklisted.id), ApplicationDepartment.STAFF),
      ).rejects.toThrow("بلاك ليست الستاف");
      await expect(
        staffApplicationService.submit(guild as never, highStaff as never, draft(highStaff.id), ApplicationDepartment.STAFF),
      ).rejects.toThrow("عضو ستاف أصلاً");
      expect(await appFor(blacklisted.id)).toBeNull();
    });
  });

  describe("transfer", () => {
    const info = { memberCount: 12000, onlineCount: 1500, roleOrder: 5, invite: null };

    it("opens a transfer ticket with the recruiter, stored evidence and a proposal", async () => {
      const member = applicant();
      await staffTransferApplicationService.submit(
        guild as never,
        member as never,
        draft(member.id, {
          type: ApplicationType.TRANSFER_APPLICATION,
          gender: undefined,
          transfer: info,
          recruiterStaffId: owner.id,
          recruiterAssignedAt: new Date(),
        }),
        evidence(4),
      );

      const application = await appFor(member.id);
      expect(application!.type).toBe(ApplicationType.TRANSFER_APPLICATION);
      expect(application!.recruiterStaffId).toBe(owner.id);
      expect(application!.transfer!.sourceServerMemberCount).toBe(12000);
      expect(application!.transfer!.sourceServerOnlineCount).toBe(1500);
      expect(application!.transfer!.sourceRoleOrder).toBe(5);
      expect(application!.evidenceCount).toBe(4);
      expect(application!.robticJoinedAt).not.toBeNull();
      expect(application!.evaluation!.eligible).toBe(true);
      expect(application!.evaluation!.proposedStaffLevel).not.toBeNull();
      expect(await ApplicationEvidenceModel.countDocuments({ applicationId: application!.applicationId })).toBe(4);

      const ticket = await ticketFor(member.id);
      expect(ticket!.panelId).toBe("staff-transfer-application");
      expect(ticket!.claimableRoles.map((slot) => slot.roleId)).toEqual([TRANSFER]);
    });

    it("stores no recruiter when none was chosen and flags a small server as ineligible", async () => {
      const member = applicant();
      await staffTransferApplicationService.submit(
        guild as never,
        member as never,
        draft(member.id, {
          type: ApplicationType.TRANSFER_APPLICATION,
          gender: undefined,
          transfer: { ...info, memberCount: 3000, onlineCount: 100 },
        }),
        evidence(5),
      );
      const application = await appFor(member.id);
      expect(application!.recruiterStaffId).toBeNull();
      expect(application!.evaluation!.eligible).toBe(false);
      expect(application!.evaluation!.ineligibleReasons).toContain("MEMBER_COUNT");

      const ctx = await contextFor(member.id);
      await ticketService.claimRole(ctx.ticket.ticketId, manager as never, TRANSFER);
      await expect(
        applicationDecisionService.accept(manager as never, await contextFor(member.id), null),
      ).rejects.toThrow("غير مؤهل");
    });

    it("refuses too little evidence without creating anything", async () => {
      const member = applicant();
      await expect(
        staffTransferApplicationService.submit(
          guild as never,
          member as never,
          draft(member.id, { type: ApplicationType.TRANSFER_APPLICATION, gender: undefined, transfer: info }),
          evidence(2),
        ),
      ).rejects.toThrow("4");
      expect(await appFor(member.id)).toBeNull();
    });
  });

  describe("From Him validation", () => {
    it("rejects a recruiter below Owner, the applicant themselves, and unknown users", async () => {
      const member = applicant();
      const check = (id: string) =>
        staffRecruitmentService.relationshipForNewApplication(guild as never, member.id, id, new Date());
      await expect(check(highStaff.id)).rejects.toThrow("أونر أو أعلى");
      await expect(check(member.id)).rejects.toThrow("نفسك");
      await expect(check("nobody-here")).rejects.toThrow("مو موجود");
      expect((await check(owner.id)).recruiterStaffId).toBe(owner.id);
    });

    it("re-validates at submission — a recruiter demoted in the meantime is refused", async () => {
      const member = applicant();
      const demoted = addMember(guild, "was-owner", ["lvl-0", "lvl-1"]);
      await expect(
        staffApplicationService.submit(
          guild as never,
          member as never,
          draft(member.id, { recruiterStaffId: demoted.id, recruiterAssignedAt: new Date() }),
          ApplicationDepartment.STAFF,
        ),
      ).rejects.toThrow("أونر أو أعلى");
      expect(await appFor(member.id)).toBeNull();
    });

    it("keeps an earlier recruiter instead of silently overwriting it", async () => {
      const member = applicant();
      await staffApplicationService.submit(
        guild as never,
        member as never,
        draft(member.id, { recruiterStaffId: owner.id, recruiterAssignedAt: new Date() }),
        ApplicationDepartment.STAFF,
      );
      await StaffApplicationModel.updateMany(
        { userId: member.id },
        { $set: { applicationStatus: ApplicationStatus.CLOSED } },
      ).exec();

      const secondOwner = addMember(guild, "owner-2", ["lvl-0", "lvl-1", "lvl-2", "lvl-3"]);
      const relationship = await staffRecruitmentService.relationshipForNewApplication(
        guild as never,
        member.id,
        secondOwner.id,
        new Date(),
      );
      expect(relationship.recruiterStaffId).toBe(owner.id);
    });

    it("!from saves once, refuses a silent overwrite, and lets an administrator replace", async () => {
      const member = applicant();
      await staffApplicationService.submit(guild as never, member as never, draft(member.id), ApplicationDepartment.STAFF);
      const ticket = await ticketFor(member.id);
      await ticketService.claimRole(ticket!.ticketId, manager as never, APPLY);
      const ctx = await contextFor(member.id);

      expect(
        await staffRecruitmentService.setRecruiter({ actor: manager as never, application: ctx.application, recruiterId: owner.id, replace: false }),
      ).toBe("SAVED");

      const fresh = await contextFor(member.id);
      const secondOwner = addMember(guild, "owner-3", ["lvl-0", "lvl-1", "lvl-2", "lvl-3"]);
      await expect(
        staffRecruitmentService.setRecruiter({ actor: manager as never, application: fresh.application, recruiterId: secondOwner.id, replace: false }),
      ).rejects.toThrow("من قبل");
      await expect(
        staffRecruitmentService.setRecruiter({ actor: manager as never, application: fresh.application, recruiterId: secondOwner.id, replace: true }),
      ).rejects.toThrow("للأدمن");
      expect(
        await staffRecruitmentService.setRecruiter({ actor: admin as never, application: fresh.application, recruiterId: secondOwner.id, replace: true }),
      ).toBe("REPLACED");

      const application = await appFor(member.id);
      expect(application!.recruiterStaffId).toBe(secondOwner.id);
      expect(application!.recruiterReplacements[0]!.previousRecruiterStaffId).toBe(owner.id);
    });
  });

  describe("manager claim and decisions", () => {
    it("lets exactly one manager claim, awards one point, and keeps the recruiter through acceptance", async () => {
      const member = applicant();
      await staffApplicationService.submit(
        guild as never,
        member as never,
        draft(member.id, { recruiterStaffId: owner.id, recruiterAssignedAt: new Date() }),
        ApplicationDepartment.STAFF,
      );
      const ticket = await ticketFor(member.id);

      const results = await Promise.allSettled([
        ticketService.claimRole(ticket!.ticketId, manager as never, APPLY),
        ticketService.claimRole(ticket!.ticketId, otherManager as never, APPLY),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

      const claimed = await TicketModel.findOne({ ticketId: ticket!.ticketId }).exec();
      const winnerId = claimed!.claimedByDiscordId!;
      const winner = winnerId === manager.id ? manager : otherManager;
      const loser = winner === manager ? otherManager : manager;
      expect(claimed!.status).toBe(TicketStatus.CLAIMED);
      expect(claimed!.claimableRoles[0]!.claimedBy).toBe(winnerId);

      const points = await StaffPointTransactionModel.find({
        referenceId: ticket!.ticketId,
        type: StaffPointTransactionType.TICKET_CLAIM,
      }).exec();
      expect(points).toHaveLength(1);

      const channel = guild.channels.byId.get(ticket!.channelId)!;
      expect(channel.overwrites.get(winnerId).SendMessages).toBe(true);
      expect((await appFor(member.id))!.applicationStatus).toBe(ApplicationStatus.CLAIMED);

      await expect(
        applicationDecisionService.accept(loser as never, await contextFor(member.id), null),
      ).rejects.toThrow("استلم الطلب");

      await expect(
        applicationDecisionService.accept(winner as never, await contextFor(member.id), {
          level: null,
          max: true,
          tier: null,
          staffType: null,
        }),
      ).rejects.toThrow();
      expect((await appFor(member.id))!.applicationStatus).toBe(ApplicationStatus.CLAIMED);

      const outcome = await applicationDecisionService.accept(winner as never, await contextFor(member.id), {
        level: 1,
        max: false,
        tier: null,
        staffType: null,
      });
      expect(outcome.result.level).toBe(1);

      const application = await appFor(member.id);
      expect(application!.applicationStatus).toBe(ApplicationStatus.ACCEPTED);
      expect(application!.acceptedBy).toBe(winnerId);
      expect(application!.recruiterStaffId).toBe(owner.id);
      const staff = await StaffModel.findOne({ guildId: GUILD, userId: member.id }).exec();
      expect(staff!.status).toBe(StaffStatus.ACTIVE);
      expect(staff!.currentRoleLevel).toBe(1);
    });

    it("gives a later manager role its own view-only slot without touching the first claimer", async () => {
      const member = applicant();
      await staffApplicationService.submit(
        guild as never,
        member as never,
        draft(member.id, { gender: ApplicantGender.FEMALE }),
        ApplicationDepartment.STAFF,
      );
      const ticket = await ticketFor(member.id);
      const girlsManager = addMember(guild, "girls-mgr-2", [GIRLS]);

      await ticketService.claimRole(ticket!.ticketId, girlsManager as never, GIRLS);
      await expect(ticketService.claimRole(ticket!.ticketId, manager as never, APPLY)).rejects.toThrow();

      await ticketService.addClaimableRole(ticket!.ticketId, guild as never, TRANSFER);
      const channel = guild.channels.byId.get(ticket!.channelId)!;
      expect(channel.overwrites.get(TRANSFER).SendMessages).toBe(false);
      expect(channel.overwrites.get(girlsManager.id).SendMessages).toBe(true);

      const late = await ticketService.claimRole(ticket!.ticketId, manager as never, TRANSFER);
      expect(late.tookTicket).toBe(false);
      const after = await TicketModel.findOne({ ticketId: ticket!.ticketId }).exec();
      expect(after!.claimedByDiscordId).toBe(girlsManager.id);
      expect(channel.overwrites.get(girlsManager.id).SendMessages).toBe(true);
      expect(channel.overwrites.get(manager.id).SendMessages).toBe(true);
    });

    it("keeps !claim working and refuses members without the manager role", async () => {
      const member = applicant();
      await staffApplicationService.submit(guild as never, member as never, draft(member.id), ApplicationDepartment.STAFF);
      const ticket = await ticketFor(member.id);
      const panel = (await import("../../../data/tickets/index.ts")).getPanel(ticket!.panelId)!;

      await expect(ticketService.claimTicket(ticket!.ticketId, highStaff as never, panel)).rejects.toThrow();
      await expect(ticketService.claimRole(ticket!.ticketId, member as never, APPLY)).rejects.toThrow();
      const result = await ticketService.claimTicket(ticket!.ticketId, otherManager as never, panel);
      expect(result.ticket.claimedByDiscordId).toBe(otherManager.id);
    });

    it("refuses with a reason and writes no staff history", async () => {
      const member = applicant();
      await staffApplicationService.submit(guild as never, member as never, draft(member.id), ApplicationDepartment.STAFF);
      const ticket = await ticketFor(member.id);
      await ticketService.claimRole(ticket!.ticketId, manager as never, APPLY);

      await expect(applicationDecisionService.refuse(manager as never, await contextFor(member.id), "  ")).rejects.toThrow();
      await applicationDecisionService.refuse(manager as never, await contextFor(member.id), "ما يناسب");

      const application = await appFor(member.id);
      expect(application!.applicationStatus).toBe(ApplicationStatus.REJECTED);
      expect(application!.rejectionReason).toBe("ما يناسب");
      expect(await StaffModel.findOne({ guildId: GUILD, userId: member.id }).exec()).toBeNull();
      await expect(
        applicationDecisionService.accept(manager as never, await contextFor(member.id), null),
      ).rejects.toThrow("من قبل");
    });

    it("marks the application closed when its ticket closes", async () => {
      const member = applicant();
      await staffApplicationService.submit(guild as never, member as never, draft(member.id), ApplicationDepartment.STAFF);
      const ticket = await ticketFor(member.id);
      const panel = (await import("../../../data/tickets/index.ts")).getPanel(ticket!.panelId)!;
      await ticketService.closeTicket(ticket!.ticketId, admin.id, panel, guild as never);
      expect((await appFor(member.id))!.applicationStatus).toBe(ApplicationStatus.CLOSED);
    });
  });

  describe("Fast Access in application tickets", () => {
    it("runs the application context for managers only", async () => {
      await fastAccessService.create({
        guildId: GUILD,
        command: "welcomeapp",
        message: "أهلاً",
        contextType: FastAccessContext.STAFF_APPLICATION,
        createdBy: admin.id,
      });
      const member = applicant();
      await staffApplicationService.submit(guild as never, member as never, draft(member.id), ApplicationDepartment.STAFF);
      const ticket = await ticketFor(member.id);

      const run = (who: FakeMember) =>
        fastAccessRunner.execute({
          guildId: GUILD,
          channelId: ticket!.channelId,
          member: who as never,
          command: "welcomeapp",
          sourceMessageId: "src",
        });
      expect(await run(manager)).toEqual({ delivered: true, context: FastAccessContext.STAFF_APPLICATION });
      expect(await run(highStaff)).toEqual({ delivered: false, reason: "NO_PERMISSION" });
    });
  });
});
