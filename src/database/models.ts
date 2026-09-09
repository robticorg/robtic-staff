import type { Model } from "mongoose";
import { StaffModel } from "../modules/staff/models/staff.model.ts";
import { StaffActivityModel } from "../modules/staff/models/staff-activity.model.ts";
import { StaffPointTransactionModel } from "../modules/staff/models/staff-point-transaction.model.ts";
import { StaffHistoryModel } from "../modules/staff/models/staff-history.model.ts";
import { StaffWarningModel } from "../modules/warnings/models/staff-warning.model.ts";
import { UserWarningModel } from "../modules/warnings/models/user-warning.model.ts";
import { ReportModel } from "../modules/reports/models/report.model.ts";
import { AppealModel } from "../modules/appeals/models/appeal.model.ts";
import { RoleConfigModel } from "../modules/configuration/models/role-config.model.ts";
import { ChannelConfigModel } from "../modules/configuration/models/channel-config.model.ts";
import { FastAccessModel } from "../modules/configuration/models/fast-access.model.ts";
import { ModmailCaseModel } from "../modules/modmail/models/modmail-case.model.ts";
import { ModmailMessageModel } from "../modules/modmail/models/modmail-message.model.ts";
import { ModmailAttachmentModel } from "../modules/modmail/models/modmail-attachment.model.ts";
import { ModmailAuditModel } from "../modules/modmail/models/modmail-audit.model.ts";
import { TicketModel } from "../modules/tickets/models/ticket.model.ts";
import { FaqModel } from "../modules/tickets/models/faq.model.ts";
import { TicketTranscriptModel } from "../modules/tickets/models/ticket-transcript.model.ts";
import { TicketPanelDeploymentModel } from "../modules/tickets/models/ticket-panel-deployment.model.ts";
import { PunishmentModel } from "../modules/punishment/models/punishment.model.ts";
import { PunishmentApprovalModel } from "../modules/punishment/models/punishment-approval.model.ts";
import { PunishmentAuditModel } from "../modules/punishment/models/punishment-audit.model.ts";
import { VacationModel } from "../modules/vacation/models/vacation.model.ts";
import { VacationPanelDeploymentModel } from "../modules/vacation/models/vacation-panel-deployment.model.ts";
import { GiftClaimModel } from "../modules/gift-claims/models/gift-claim.model.ts";
import { GiftClaimAuditModel } from "../modules/gift-claims/models/gift-claim-audit.model.ts";
import { CounterModel } from "../shared/sequence.ts";
import { logger } from "../shared/utils/logger.ts";

export const ALL_MODELS: Model<any>[] = [
  StaffModel,
  StaffActivityModel,
  StaffPointTransactionModel,
  StaffHistoryModel,
  StaffWarningModel,
  UserWarningModel,
  ReportModel,
  AppealModel,
  RoleConfigModel,
  ChannelConfigModel,
  FastAccessModel,
  ModmailCaseModel,
  ModmailMessageModel,
  ModmailAttachmentModel,
  ModmailAuditModel,
  TicketModel,
  FaqModel,
  TicketTranscriptModel,
  TicketPanelDeploymentModel,
  PunishmentModel,
  PunishmentApprovalModel,
  PunishmentAuditModel,
  VacationModel,
  VacationPanelDeploymentModel,
  GiftClaimModel,
  GiftClaimAuditModel,
  CounterModel,
];

export async function syncAllIndexes(): Promise<void> {
  const log = logger.child("indexes");
  for (const model of ALL_MODELS) {
    await model.syncIndexes();
    log.debug(`synced indexes for ${model.modelName}`);
  }
  log.info(`synced indexes for ${ALL_MODELS.length} models`);
}
