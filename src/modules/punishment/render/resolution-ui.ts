import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { PunCustomId } from "../handlers/component-ids.ts";
import { resolutionSelectOptions } from "./modals.ts";

export function buildResolutionPrompt(caseId: string, ownerId: string): BaseMessageOptions {
  const select = new StringSelectMenuBuilder()
    .setCustomId(PunCustomId.resolveSelect(caseId, ownerId))
    .setPlaceholder(punishmentMessages.resolution.selectPlaceholder)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(resolutionSelectOptions());

  return {
    content: punishmentMessages.resolution.prompt(caseId),
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    allowedMentions: { parse: [] },
  };
}
