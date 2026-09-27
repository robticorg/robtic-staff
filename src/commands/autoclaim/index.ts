import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { giftDeliveryRuntimeConfig } from "../../config/index.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { giftDeliveryMessages } from "../../data/gift-claim/delivery-messages.ts";
import { staffConfigService } from "../../modules/configuration/services/staff-config.service.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replyInfo, replySuccess } from "../_shared/responses.ts";

const copy = commandCopy.autoclaim;
const M = giftDeliveryMessages.autoclaim;
const STATE = "state";

const data = new SlashCommandBuilder()
  .setName(CommandName.AUTOCLAIM)
  .setDescription(copy.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addStringOption((o) =>
    o
      .setName(STATE)
      .setDescription(copy.options.state)
      .setRequired(true)
      .addChoices(
        { name: copy.choices.on, value: "on" },
        { name: copy.choices.off, value: "off" },
        { name: copy.choices.status, value: "status" },
      ),
  );

function notes(enabled: boolean): string[] {
  return enabled && !giftDeliveryRuntimeConfig.autoclaimApiUrl ? [M.urlMissingNote] : [];
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    requireAdministrator(interaction);

    const state = interaction.options.getString(STATE, true);
    if (state === "status") {
      const enabled = await staffConfigService.isAutoclaimEnabled(guild.id);
      const lines = [enabled ? M.statusOn : M.statusOff, ...notes(enabled)];
      await replyInfo(interaction, lines.join("\n"));
      return;
    }

    const enabled = await staffConfigService.setAutoclaimEnabled(guild.id, state === "on");
    await replySuccess(interaction, enabled ? M.enabled : M.disabled, ...notes(enabled));
  },
});
