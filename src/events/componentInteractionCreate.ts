import { Events, MessageFlags, type Interaction } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { routeModmailComponent } from "../modules/modmail/handlers/index.ts";
import { routeTicketComponent } from "../modules/tickets/handlers/index.ts";
import { routeFaqComponent } from "../modules/tickets/handlers/faq-add.handler.ts";
import { routePunishmentComponent } from "../modules/punishment/handlers/index.ts";
import { routeVacationComponent } from "../modules/vacation/handlers/index.ts";
import { routeStaffSupportComponent } from "../modules/staff-support/handlers/component-router.ts";
import { routeApplicationComponent } from "../modules/applications/handlers/component-router.ts";
import { routeAppealComponent } from "../modules/appeals/handlers/index.ts";
import { routeGiftClaimComponent } from "../modules/gift-claims/handlers/index.ts";
import { routeWarningPanelComponent } from "../modules/warning-panel/handlers/component-router.ts";
import { routeStaffStatsComponent } from "../modules/staff-stats/handlers/component-router.ts";
import { routeStaffInfoComponent } from "../modules/staff-info/handlers/component-router.ts";
import { routeResponsibilityComponent } from "../modules/responsibilities/index.ts";
import { routeGiveawayComponent } from "../modules/giveaways/handlers/component-router.ts";
import { routeHiddenStaffComponent } from "../modules/staff/hidden/handlers/component-router.ts";
import { routePanelConfigComponent } from "../modules/tickets/panel-config/component-router.ts";
import { routeResponsibilityApplyComponent } from "../modules/tickets/responsibility-apply/component-router.ts";
import { routePointValuesComponent } from "../modules/staff/point-values/component-router.ts";
import { routeBotProfileComponent } from "../modules/bot-profile/component-router.ts";
import { staffPolicyService } from "../modules/configuration/services/staff-policy.service.ts";
import type { StaffFeatureKey } from "../modules/configuration/models/staff-policy.model.ts";
import { resolvePrimaryGuild } from "../modules/modmail/runtime.ts";
import { staffPolicyMessages } from "../data/staff-policy/messages.ts";
import { logger } from "../shared/utils/logger.ts";

const log = logger.child("feature-gate");

/** Which system a button / menu / modal belongs to, by its custom-id namespace (each module's component-ids.ts). */
const FEATURE_BY_NAMESPACE: Record<string, StaffFeatureKey> = {
  vac: "vacations",
  ap: "applications",
  apl: "appeals",
  gc: "giftClaims",
  pun: "punishments",
  mm: "reports",
};

/**
 * A system the server turned off (dashboard) ignores its components: the member is told so instead. DMs (reports,
 * appeals) have no server, so they use the community server the bot serves.
 */
async function blockedByFeature(interaction: Interaction & { customId: string }): Promise<boolean> {
  const feature = FEATURE_BY_NAMESPACE[interaction.customId.split(":")[0] ?? ""];
  if (!feature) return false;
  let guildId = interaction.guildId;
  if (!guildId) {
    try {
      guildId = resolvePrimaryGuild().id;
    } catch {
      return false;
    }
  }
  if (await staffPolicyService.isOn(guildId, feature).catch(() => true)) return false;
  if (interaction.isRepliable()) {
    await interaction.reply({ content: staffPolicyMessages.featureOff, flags: MessageFlags.Ephemeral }).catch((err) => log.debug("feature-off reply failed", err));
  }
  return true;
}

const routers = [
  routeModmailComponent,
  routeTicketComponent,
  routeFaqComponent,
  routePunishmentComponent,
  routeVacationComponent,
  routeStaffSupportComponent,
  routeApplicationComponent,
  routeAppealComponent,
  routeGiftClaimComponent,
  routeWarningPanelComponent,
  routeStaffStatsComponent,
  routeStaffInfoComponent,
  routeResponsibilityComponent,
  routeGiveawayComponent,
  routeHiddenStaffComponent,
  routePanelConfigComponent,
  routeResponsibilityApplyComponent,
  routePointValuesComponent,
  routeBotProfileComponent,
];

export default defineEvent({
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isModalSubmit()
    ) {
      return;
    }

    if (await blockedByFeature(interaction)) return;

    for (const route of routers) {
      if (await route(interaction)) return;
    }
  },
});
