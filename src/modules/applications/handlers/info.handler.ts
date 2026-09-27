import { MessageFlags, type ButtonInteraction } from "discord.js";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { buildApplicationInfo } from "../render/application-info.ts";
import { applicationContextService } from "../services/application-context.service.ts";
import { markUnderReview } from "../services/application-lifecycle.ts";
import { applicationPermissionService } from "../services/application-permission.service.ts";

const M = staffApplicationMessages;

export async function handleApplicationInfo(
  interaction: ButtonInteraction,
  applicationId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const ctx = await applicationContextService.forApplication(interaction.guildId, applicationId);
  if (!ctx) {
    await interaction.reply({ content: M.decision.notInApplication, flags: MessageFlags.Ephemeral });
    return;
  }
  const { ticket, application } = ctx;
  if (!applicationPermissionService.canViewInfo(interaction.member, ticket, application)) {
    await interaction.reply({ content: M.info.notAllowed, flags: MessageFlags.Ephemeral });
    return;
  }
  if (applicationPermissionService.hasClaimed(interaction.member, ticket)) {
    await markUnderReview(interaction.guildId, application.applicationId);
  }
  await interaction.reply(buildApplicationInfo(application));
}
