import type { Client } from "discord.js";
import { attachPunishmentClient } from "../modules/punishment/index.ts";
import { attachVacationClient } from "../modules/vacation/index.ts";
import { attachServerTagClient } from "../modules/server-tag/index.ts";
import { attachWarningPanelClient } from "../modules/warning-panel/runtime.ts";
import { warningPanelRefreshService } from "../modules/warning-panel/services/warning-panel-refresh.service.ts";
import { vacationExpirationService } from "../modules/vacation/services/vacation-expiration.service.ts";
import { serverTagExpirationService } from "../modules/server-tag/services/server-tag-expiration.service.ts";
import { serverTagAuditService } from "../modules/server-tag/services/server-tag-audit.service.ts";
import { jailExpirationService } from "../modules/punishment/services/jail-expiration.service.ts";
import { ladderSyncService } from "../modules/configuration/services/ladder-sync.service.ts";
import { registerHiddenStaff } from "../modules/staff/hidden/index.ts";
import { internalApiServer } from "../modules/internal-api/server.ts";
import { staffPolicyService } from "../modules/configuration/services/staff-policy.service.ts";

export function attachModuleClients(client: Client): void {
  attachPunishmentClient(client);
  attachVacationClient(client);
  attachServerTagClient(client);
  attachWarningPanelClient(client);
  registerHiddenStaff();
}

export function startModuleRuntime(): void {
  // Per-server rules (dashboard): preload now, refresh every few minutes.
  staffPolicyService.start();

  vacationExpirationService.start();

  serverTagExpirationService.start();

  jailExpirationService.start();

  warningPanelRefreshService.start();

  internalApiServer.start();
}

export function stopModuleRuntime(): void {
  vacationExpirationService.stop();
  serverTagExpirationService.stop();
  jailExpirationService.stop();
  serverTagAuditService.stop();
  ladderSyncService.stop();
  warningPanelRefreshService.stop();
  internalApiServer.stop();
}
