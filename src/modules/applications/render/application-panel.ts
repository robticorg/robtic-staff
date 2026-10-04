import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { staffTransferRules } from "../../../data/staff-application/config.ts";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_TYPE_LABELS,
  DEPARTMENT_LABELS,
  GENDER_LABELS,
  staffApplicationMessages,
} from "../../../data/staff-application/messages.ts";
import { TicketCustomId } from "../../tickets/handlers/component-ids.ts";
import { v2MessageOptions } from "../../tickets/render/v2.ts";
import { ApplicationCustomId } from "../shared/component-ids.ts";
import { ApplicationStatus, ApplicationType } from "../shared/enums.ts";
import type { StaffApplication } from "../shared/staff-application.model.ts";

const T = staffApplicationMessages.ticket;
const I = staffApplicationMessages.info;

export type ApplicationPanelInput = Pick<
  StaffApplication,
  | "applicationId"
  | "userId"
  | "type"
  | "department"
  | "gender"
  | "evaluation"
  | "applicationStatus"
>;

export function proposedLabel(evaluation: StaffApplication["evaluation"]): string {
  if (!evaluation || evaluation.proposedStaffLevel === null) return I.noProposal;
  return I.proposedLevel(evaluation.proposedStaffRoleId, evaluation.proposedStaffLevel);
}

function toneFor(status: StaffApplication["applicationStatus"]): number {
  if (status === ApplicationStatus.ACCEPTED) return colors.success;
  if (status === ApplicationStatus.REJECTED) return colors.error;
  return colors.primary;
}

function ineligibleLines(evaluation: StaffApplication["evaluation"]): string[] {
  if (!evaluation) return [];
  if (!evaluation.eligible) {
    const lines: string[] = [T.ineligibleHeading];
    for (const reason of evaluation.ineligibleReasons) {
      if (reason === "MEMBER_COUNT") {
        lines.push(T.ineligible.MEMBER_COUNT(staffTransferRules.minimumSourceMemberCount));
      }
    }
    return lines;
  }
  return evaluation.proposedTier && evaluation.proposedStaffLevel === null ? [T.tierNotConfigured] : [];
}

export function buildApplicationPanel(
  ticketId: string,
  application: ApplicationPanelInput,
  managerRoleIds: readonly string[],
): BaseMessageOptions {
  const isTransfer = application.type === ApplicationType.TRANSFER_APPLICATION;
  const container = new ContainerBuilder().setAccentColor(toneFor(application.applicationStatus));

  container.addTextDisplayComponents((t) =>
    t.setContent(isTransfer ? T.transferHeader(ticketId) : T.applicationHeader(ticketId)),
  );
  container.addTextDisplayComponents((t) =>
    t.setContent(isTransfer ? T.transferOpened : T.applicationOpened),
  );
  container.addSeparatorComponents((s) => s.setDivider(true));

  const lines = [T.applicant(application.userId), T.type(APPLICATION_TYPE_LABELS[application.type] ?? application.type)];
  if (application.department) {
    lines.push(T.department(DEPARTMENT_LABELS[application.department] ?? application.department));
  }
  if (application.gender) lines.push(T.gender(GENDER_LABELS[application.gender] ?? application.gender));
  if (isTransfer) {
    lines.push(T.proposed(proposedLabel(application.evaluation)));
    lines.push(T.proposedNote);
    lines.push(...ineligibleLines(application.evaluation));
  }
  if (managerRoleIds.length > 0) lines.push(T.managers(managerRoleIds));
  for (const line of lines) container.addTextDisplayComponents((t) => t.setContent(line));

  container.addTextDisplayComponents((t) =>
    t.setContent(
      T.status(APPLICATION_STATUS_LABELS[application.applicationStatus] ?? application.applicationStatus),
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(TicketCustomId.optClose(ticketId))
        .setLabel(T.closeButton)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(TicketCustomId.options(ticketId))
        .setLabel(T.optionsButton)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ApplicationCustomId.info(application.applicationId))
        .setLabel(T.infoButton)
        .setStyle(ButtonStyle.Primary),
    ),
  );

  return { ...v2MessageOptions(container), allowedMentions: { parse: [] } };
}
