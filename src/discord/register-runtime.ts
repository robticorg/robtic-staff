import type { Client } from "discord.js";
import { attachModmailClient } from "../modules/modmail/index.ts";
import { attachTicketClient } from "../modules/tickets/index.ts";
import { attachPunishmentClient } from "../modules/punishment/index.ts";
import { attachVacationClient } from "../modules/vacation/index.ts";
import { attachAppealClient } from "../modules/appeals/index.ts";
import { attachGiftClaimClient } from "../modules/gift-claims/index.ts";
import { vacationExpirationService } from "../modules/vacation/services/vacation-expiration.service.ts";

export function attachModuleClients(client: Client): void {
  attachModmailClient(client);
  attachTicketClient(client);
  attachPunishmentClient(client);
  attachVacationClient(client);
  attachAppealClient(client);
  attachGiftClaimClient(client);
}

export function startModuleRuntime(): void {
  vacationExpirationService.start();
}

export function stopModuleRuntime(): void {
  vacationExpirationService.stop();
}
