import { MessageFlags, type Interaction } from "discord.js";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { buildGiveawayPickResult } from "../render/pick-menu.ts";
import { giveawayService } from "../services/giveaway.service.ts";
import { parseGiveawayCustomId } from "./component-ids.ts";

const log = logger.child("giveaways:components");
const D = giveawayMessages.done;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function routeGiveawayComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isStringSelectMenu()) return false;
  const parsed = parseGiveawayCustomId(interaction.customId);
  if (!parsed || parsed.action !== "done") return false;
  if (!interaction.inCachedGuild()) return true;

  const [executorId, userId] = parsed.args;
  try {
    if (interaction.user.id !== executorId || !userId) {
      await interaction.reply({ content: D.notAuthor, ...EPHEMERAL });
      return true;
    }
    if (!(await staffPermissionService.canActAsStaff(interaction.member))) {
      await interaction.reply({ content: D.notStaff, ...EPHEMERAL });
      return true;
    }
    const giveaway = await giveawayService.byId(interaction.guildId, interaction.values[0] ?? "");
    if (!giveaway) {
      await interaction.reply({ content: D.giveawayGone, ...EPHEMERAL });
      return true;
    }
    const saved = await giveawayService.markDone(giveaway, userId, interaction.user.id);
    await interaction.update(
      buildGiveawayPickResult(
        saved ? D.saved(userId, giveaway.channelId, giveaway.endsAt) : D.alreadySaved(userId),
        saved,
      ),
    );
  } catch (err) {
    log.error("giveaway pick failed", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: D.giveawayGone, ...EPHEMERAL }).catch(() => undefined);
    }
  }
  return true;
}
