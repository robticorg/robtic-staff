import { bootstrap } from "../bootstrap.ts";
import { disconnectDatabase, mongoose } from "../database/connect.ts";
import { logger } from "../shared/utils/logger.ts";
import {
  StaffHistoryAction,
  StaffActivityType,
  StaffPointTransactionType,
  StaffStatus,
  staffActivityService,
  staffHistoryService,
  staffPointService,
  staffService,
} from "../modules/staff/index.ts";
import {
  staffWarningService,
  userWarningService,
  WarningSource,
} from "../modules/warnings/index.ts";
import {
  ChannelConfigType,
  RoleConfigType,
  channelConfigService,
  roleConfigService,
} from "../modules/configuration/index.ts";
import { reportService } from "../modules/reports/index.ts";
import { ReportType } from "../modules/reports/types/enums.ts";

const log = logger.child("example");

const GUILD = "demo-guild-1";
const ADMIN = "demo-admin-1";
const USER = "demo-user-1";
const OFFENDER = "demo-offender-1";

async function main(): Promise<void> {
  await bootstrap();

  await roleConfigService.setRole({ guildId: GUILD, roleId: "role-new-staff", type: RoleConfigType.START });
  await roleConfigService.rebuildLadder(GUILD, ["role-new-staff", "role-helper", "role-mod", "role-admin"]);
  await roleConfigService.setRole({ guildId: GUILD, roleId: "role-staff", type: RoleConfigType.STAFF });
  await roleConfigService.setRole({ guildId: GUILD, roleId: "role-booster", type: RoleConfigType.IGNORE });
  await channelConfigService.set({ guildId: GUILD, type: ChannelConfigType.REPORTS, channelId: "chan-reports" });

  const ladder = await roleConfigService.getStaffRoleLevels(GUILD);
  log.info("ladder", ladder);
  log.info("highest level for [role-mod]", await roleConfigService.getHighestStaffLevel(GUILD, ["role-mod", "role-booster"]));

  const staff = await staffService.create({ userId: USER, guildId: GUILD, acceptedBy: ADMIN, currentRoleLevel: 0 });
  await staffHistoryService.record({
    staffId: staff.id,
    action: StaffHistoryAction.ACCEPT,
    performedBy: ADMIN,
    newRoleLevel: 0,
  });

  const report = await reportService.create({
    guildId: GUILD,
    type: ReportType.USER_REPORT,
    reporterId: USER,
    reportedUserId: OFFENDER,
  });
  await reportService.claim(report.reportId, staff.id);
  await staffService.incrementCounters(staff.id, { reportsClaimed: 1 });
  await staffActivityService.create({
    staffId: staff.id,
    type: StaffActivityType.REPORT_CLAIM,
    referenceId: report.reportId,
  });
  const first = await staffPointService.add({
    staffId: staff.id,
    amount: 1,
    type: StaffPointTransactionType.REPORT_CLAIM,
    referenceId: report.reportId,
    reason: `Claimed report ${report.reportId}`,
  });
  const dup = await staffPointService.add({
    staffId: staff.id,
    amount: 1,
    type: StaffPointTransactionType.REPORT_CLAIM,
    referenceId: report.reportId,
    reason: "Accidental double award",
  });
  log.info("first award", { balance: first.balance, duplicate: first.duplicate });
  log.info("second award blocked", { balance: dup.balance, duplicate: dup.duplicate });

  await staffWarningService.issueVerbal({
    guildId: GUILD,
    staffId: staff.id,
    reason: "Slow response times",
    issuedBy: ADMIN,
    evidence: ["https://cdn.example/att1.png"],
  });
  await userWarningService.issue({
    userId: OFFENDER,
    guildId: GUILD,
    reason: "Spam",
    issuedBy: USER,
    source: WarningSource.REPORT,
    reportId: report.reportId,
  });

  const summary = await staffPointService.getSummary(staff.id);
  log.info("points summary", summary);
  log.info("cached stats", await staffService.getStats(staff.id));

  if (process.env.KEEP_DEMO !== "1") {
    await Promise.all(
      mongoose.modelNames().map((name) => mongoose.model(name).deleteMany({
        $or: [
          { guildId: GUILD },
          { staffId: staff._id },
          { appellantId: { $in: [USER, OFFENDER] } },
        ],
      })),
    );
    log.info("demo data cleaned up (set KEEP_DEMO=1 to keep it)");
  }

  await disconnectDatabase();
}

main().catch((err) => {
  log.error("example failed", err);
  process.exitCode = 1;
  void disconnectDatabase();
});
