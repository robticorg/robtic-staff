import { MessageFlags, type Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { pointValuesMessages as M } from "../../../data/messages/point-values.ts";
import { hasAdminAccess } from "../../access/index.ts";
import { staffConfigService } from "../../configuration/services/staff-config.service.ts";
import { pointValuesService } from "../services/point-values.service.ts";
import { POINT_VALUE_GROUPS, parsePointValue, parsePointValuesCustomId } from "./config.ts";
import { buildPointValuesModal, buildPointValuesPanel, pointTypeLabel } from "./render.ts";

const log = logger.child("staff:point-values");
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function routePointValuesComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return false;
  const parsed = parsePointValuesCustomId(interaction.customId);
  if (!parsed) return false;
  if (!interaction.inCachedGuild()) return true;

  try {
    if (!hasAdminAccess({ id: interaction.user.id, permissions: interaction.member.permissions })) {
      await interaction.reply({ content: M.adminOnly, ...EPHEMERAL });
      return true;
    }

    if (interaction.isButton() && parsed.action === "open") {
      const values = await pointValuesService.all(interaction.guildId);
      await interaction.showModal(buildPointValuesModal(parsed.group, values));
      return true;
    }

    if (interaction.isModalSubmit() && parsed.action === "modal") {
      const updates: Record<string, number> = {};
      for (const type of POINT_VALUE_GROUPS[parsed.group]) {
        const value = parsePointValue(interaction.fields.getTextInputValue(type));
        if (value === null) {
          await interaction.reply({ content: M.invalid(pointTypeLabel(type)), ...EPHEMERAL });
          return true;
        }
        updates[type] = value;
      }
      await staffConfigService.setPointValues(interaction.guildId, updates);
      const panel = buildPointValuesPanel(await pointValuesService.all(interaction.guildId));
      if (interaction.isFromMessage()) {
        await interaction.update({ content: panel.content, components: panel.components });
        await interaction.followUp({ content: M.saved, ...EPHEMERAL });
      } else {
        await interaction.reply({ ...panel, content: `${M.saved}\n\n${panel.content}` });
      }
      return true;
    }
  } catch (err) {
    log.error("point values interaction failed", err);
    const reply = { content: M.failed, ...EPHEMERAL };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => undefined);
    else await interaction.reply(reply).catch(() => undefined);
  }
  return true;
}
