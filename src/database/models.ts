import type { Model } from "mongoose";
import { StaffModel } from "../modules/staff/models/staff.model.ts";
import { StaffActivityModel } from "../modules/staff/models/staff-activity.model.ts";
import { StaffPointTransactionModel } from "../modules/staff/models/staff-point-transaction.model.ts";
import { StaffHistoryModel } from "../modules/staff/models/staff-history.model.ts";
import { StaffWarningModel } from "../modules/warnings/models/staff-warning.model.ts";
import { UserWarningModel } from "../modules/warnings/models/user-warning.model.ts";
import { RoleConfigModel } from "../modules/configuration/models/role-config.model.ts";
import { ChannelConfigModel } from "../modules/configuration/models/channel-config.model.ts";
import { FastAccessModel } from "../modules/configuration/models/fast-access.model.ts";
import { StaffConfigModel } from "../modules/configuration/models/staff-config.model.ts";
import { StaffPolicyModel } from "../modules/configuration/models/staff-policy.model.ts";
import { PunishmentModel } from "../modules/punishment/models/punishment.model.ts";
import { PunishmentAuditModel } from "../modules/punishment/models/punishment-audit.model.ts";
import { VacationModel } from "../modules/vacation/models/vacation.model.ts";
import { VacationPanelDeploymentModel } from "../modules/vacation/models/vacation-panel-deployment.model.ts";
import { StaffTagRestrictionModel } from "../modules/server-tag/models/staff-tag-restriction.model.ts";
import { PersistentMemberRoleModel } from "../modules/member-persistence/models/persistent-member-role.model.ts";
import { WarningPanelDeploymentModel } from "../modules/warning-panel/models/warning-panel-deployment.model.ts";
import { CounterModel } from "../shared/sequence.ts";
import { logger } from "../shared/utils/logger.ts";

export const ALL_MODELS: Model<any>[] = [
  StaffModel,
  StaffActivityModel,
  StaffPointTransactionModel,
  StaffHistoryModel,
  StaffWarningModel,
  UserWarningModel,
  RoleConfigModel,
  ChannelConfigModel,
  FastAccessModel,
  StaffConfigModel,
  StaffPolicyModel,
  PunishmentModel,
  PunishmentAuditModel,
  VacationModel,
  VacationPanelDeploymentModel,
  StaffTagRestrictionModel,
  PersistentMemberRoleModel,
  WarningPanelDeploymentModel,
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
