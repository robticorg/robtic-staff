import { MessageFlags, type Interaction } from "discord.js";
import { botProfileMessages as M } from "../../data/messages/bot-profile.ts";
import { hasAdminAccess } from "../access/index.ts";
import { applyBotProfile, BOT_PROFILE_MODAL_ID } from "./bot-profile-form.ts";

const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function routeBotProfileComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isModalSubmit() || interaction.customId !== BOT_PROFILE_MODAL_ID) return false;
  if (!interaction.inCachedGuild()) return true;

  if (!hasAdminAccess({ id: interaction.user.id, permissions: interaction.member.permissions })) {
    await interaction.reply({ content: M.adminOnly, ...EPHEMERAL });
    return true;
  }

  await interaction.deferReply(EPHEMERAL);
  const result = await applyBotProfile(interaction.guild, interaction);
  await interaction.editReply(!result.ok ? result.problem : result.changed.length ? M.saved(result.changed) : M.nothing);
  return true;
}
