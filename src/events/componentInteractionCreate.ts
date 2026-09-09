import { Events, type Interaction } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { routeModmailComponent } from "../modules/modmail/handlers/index.ts";
import { routeTicketComponent } from "../modules/tickets/handlers/index.ts";
import { routeFaqComponent } from "../modules/tickets/handlers/faq-add.handler.ts";
import { routePunishmentComponent } from "../modules/punishment/handlers/index.ts";
import { routeVacationComponent } from "../modules/vacation/handlers/index.ts";
import { routeAppealComponent } from "../modules/appeals/handlers/index.ts";
import { routeGiftClaimComponent } from "../modules/gift-claims/handlers/index.ts";

const routers = [
  routeModmailComponent,
  routeTicketComponent,
  routeFaqComponent,
  routePunishmentComponent,
  routeVacationComponent,
  routeAppealComponent,
  routeGiftClaimComponent,
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

    for (const route of routers) {
      if (await route(interaction)) return;
    }
  },
});
