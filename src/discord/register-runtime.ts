import type { Client } from "discord.js";
import { attachModmailClient } from "../modules/modmail/index.ts";
import { attachTicketClient } from "../modules/tickets/index.ts";
import { attachPunishmentClient } from "../modules/punishment/index.ts";
import { attachVacationClient } from "../modules/vacation/index.ts";
import { attachAppealClient } from "../modules/appeals/index.ts";
import { attachGiftClaimClient } from "../modules/gift-claims/index.ts";
import { attachServerTagClient } from "../modules/server-tag/index.ts";
import { attachWarningPanelClient } from "../modules/warning-panel/runtime.ts";
import { warningPanelRefreshService } from "../modules/warning-panel/services/warning-panel-refresh.service.ts";
import { vacationExpirationService } from "../modules/vacation/services/vacation-expiration.service.ts";
import { serverTagExpirationService } from "../modules/server-tag/services/server-tag-expiration.service.ts";
import { serverTagAuditService } from "../modules/server-tag/services/server-tag-audit.service.ts";
import { jailExpirationService } from "../modules/punishment/services/jail-expiration.service.ts";
import {
  attachResponsibilityClient,
  responsibilityExpirationService,
} from "../modules/responsibilities/index.ts";
import { ladderSyncService } from "../modules/configuration/services/ladder-sync.service.ts";
import { ticketSleepService } from "../modules/tickets/services/ticket-sleep.service.ts";
import { ticketClaimerReleaseService } from "../modules/tickets/services/ticket-claimer-release.service.ts";
import { ticketClaimCheckService } from "../modules/tickets/services/ticket-claim-check.service.ts";
import { registerApplicationLifecycle } from "../modules/applications/services/application-lifecycle.ts";
import { internalApiServer } from "../modules/internal-api/server.ts";

export function attachModuleClients(client: Client): void {
  attachModmailClient(client);
  attachTicketClient(client);
  attachPunishmentClient(client);
  attachVacationClient(client);
  attachAppealClient(client);
  attachGiftClaimClient(client);
  attachServerTagClient(client);
  attachWarningPanelClient(client);
  attachResponsibilityClient(client);
  registerApplicationLifecycle();
  ticketClaimerReleaseService.register();
}

export function startModuleRuntime(): void {
  vacationExpirationService.start();

  serverTagExpirationService.start();

  jailExpirationService.start();

  responsibilityExpirationService.start();

  ticketSleepService.start();

  ticketClaimCheckService.start();

  warningPanelRefreshService.start();

  internalApiServer.start();
}

export function stopModuleRuntime(): void {
  vacationExpirationService.stop();
  serverTagExpirationService.stop();
  jailExpirationService.stop();
  responsibilityExpirationService.stop();
  serverTagAuditService.stop();
  ticketSleepService.stop();
  ticketClaimCheckService.stop();
  ladderSyncService.stop();
  warningPanelRefreshService.stop();
  internalApiServer.stop();
}
