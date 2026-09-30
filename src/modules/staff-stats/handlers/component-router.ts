import type { GuildMember, Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { statsMessages } from "../../../data/messages/stats.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { canViewStats } from "../services/stats-permissions.ts";
import { STATS_NS, StatsView, isMenuView, parseStatsCustomId } from "./component-ids.ts";
import { renderStatsView } from "./stats-view.ts";

const log = logger.child("staff-stats:components");

export async function routeStaffStatsComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isMenu = interaction.isStringSelectMenu();
  if ((!isButton && !isMenu) || !interaction.customId.startsWith(`${STATS_NS}:`)) return false;
  const parsed = parseStatsCustomId(interaction.customId);
  if (!parsed || !interaction.inCachedGuild()) return false;

  // The dropdown carries the chosen view in its value; buttons carry it in the id.
  if (parsed.view === StatsView.MENU) {
    const chosen = isMenu ? interaction.values[0] : undefined;
    parsed.view = isMenuView(chosen) ? chosen : StatsView.HOME;
    parsed.page = 1;
  }

  try {
    if (interaction.user.id !== parsed.viewerId) {
      await replyEphemeralError(interaction, statsMessages.card.notYours);
      return true;
    }

    // Re-check: the viewer may have lost the manager role since the card was sent.
    const access = await canViewStats(interaction.member as GuildMember, parsed.targetId);
    if (!access.ok) {
      await replyEphemeralError(interaction, statsMessages.managerOnlyOthers);
      return true;
    }

    const view = await renderStatsView(
      interaction.guild,
      { viewerId: parsed.viewerId, targetId: parsed.targetId },
      parsed.view,
      parsed.page,
    );
    if (!view) {
      await replyEphemeralError(interaction, statsMessages.noStaffRecord(`<@${parsed.targetId}>`));
      return true;
    }
    await interaction.update(view as Parameters<typeof interaction.update>[0]);
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}
