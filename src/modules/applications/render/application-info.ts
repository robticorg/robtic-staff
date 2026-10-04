import { ContainerBuilder, MessageFlags, type InteractionReplyOptions } from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_TYPE_LABELS,
  DEPARTMENT_LABELS,
  GENDER_LABELS,
  GIRL_VERIFICATION_LABELS,
  formatMembershipDuration,
  staffApplicationMessages,
} from "../../../data/staff-application/messages.ts";
import { ApplicantGender, ApplicationType } from "../shared/enums.ts";
import type { StaffApplication } from "../shared/staff-application.model.ts";
import { proposedLabel } from "./application-panel.ts";

const I = staffApplicationMessages.info;
const DAY_MS = 86_400_000;

export type ApplicationInfoInput = Pick<
  StaffApplication,
  | "type"
  | "name"
  | "age"
  | "city"
  | "gender"
  | "department"
  | "girlVerification"
  | "recruiterStaffId"
  | "transfer"
  | "evaluation"
  | "evidenceCount"
  | "robticJoinedAt"
  | "applicationStatus"
>;

export function applicationInfoLines(app: ApplicationInfoInput, now: Date = new Date()): string[] {
  const lines = [I.name(app.name), I.age(app.age), I.city(app.city)];

  if (app.type === ApplicationType.TRANSFER_APPLICATION && app.transfer) {
    const source = app.transfer;
    if (source.sourceServerName) lines.push(I.sourceServer(source.sourceServerName));
    lines.push(
      I.memberCount(source.sourceServerMemberCount, source.countsVerified),
      I.onlineCount(source.sourceServerOnlineCount, source.countsVerified),
    );
    if (source.sourceRoleOrder) lines.push(I.roleOrder(source.sourceRoleOrder));
    const days = app.robticJoinedAt
      ? Math.floor((now.getTime() - app.robticJoinedAt.getTime()) / DAY_MS)
      : 0;
    lines.push(
      I.membership(formatMembershipDuration(days)),
      I.proposed(proposedLabel(app.evaluation)),
      I.evidenceCount(app.evidenceCount),
    );
  } else {
    if (app.gender) lines.push(I.gender(GENDER_LABELS[app.gender] ?? app.gender));
    lines.push(I.type(APPLICATION_TYPE_LABELS[app.type] ?? app.type));
    if (app.department) lines.push(I.department(DEPARTMENT_LABELS[app.department] ?? app.department));
    if (app.gender === ApplicantGender.FEMALE && app.girlVerification) {
      lines.push(
        I.girlVerification(GIRL_VERIFICATION_LABELS[app.girlVerification] ?? app.girlVerification),
      );
    }
  }

  lines.push(I.recruiter(app.recruiterStaffId));
  lines.push(I.status(APPLICATION_STATUS_LABELS[app.applicationStatus] ?? app.applicationStatus));
  return lines;
}

export function buildApplicationInfo(app: ApplicationInfoInput): InteractionReplyOptions {
  const container = new ContainerBuilder().setAccentColor(colors.info);
  container.addTextDisplayComponents((t) => t.setContent(I.title));
  for (const line of applicationInfoLines(app)) {
    container.addTextDisplayComponents((t) => t.setContent(line));
  }
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  };
}
