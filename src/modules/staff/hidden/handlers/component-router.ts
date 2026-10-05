import { MessageFlags, type Interaction } from "discord.js";
import { DomainError } from "../../../../shared/utils/errors.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { hiddenStaffMessages } from "../../../../data/hidden-staff/messages.ts";
import { buildHiddenResult } from "../render/level-menu.ts";
import { hiddenStaffService } from "../services/hidden-staff.service.ts";
import { parseHiddenCustomId } from "./component-ids.ts";

const log = logger.child("hidden-staff:components");
const C = hiddenStaffMessages.command;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function routeHiddenStaffComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isStringSelectMenu()) return false;
  const parsed = parseHiddenCustomId(interaction.customId);
  if (!parsed || parsed.action !== "set") return false;
  if (!interaction.inCachedGuild()) return true;

  const [executorId, targetId] = parsed.args;
  try {
    if (interaction.user.id !== executorId || !targetId) {
      await interaction.reply({ content: C.notAuthor, ...EPHEMERAL });
      return true;
    }
    const level = Number(interaction.values[0]);
    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!target || !Number.isInteger(level)) {
      await interaction.reply({ content: C.levelGone, ...EPHEMERAL });
      return true;
    }
    const chosen = await hiddenStaffService.setLevel(interaction.member, target, level);
    await interaction.update(buildHiddenResult(C.levelSet(target.id, chosen.roleId), true));
  } catch (err) {
    const content = err instanceof DomainError ? err.message : C.levelGone;
    if (!(err instanceof DomainError)) log.error("hidden level pick failed", err);
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ...EPHEMERAL }).catch(() => undefined);
    else await interaction.reply({ content, ...EPHEMERAL }).catch(() => undefined);
  }
  return true;
}
