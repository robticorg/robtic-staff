import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { appealMessages } from "../../../data/appeals/messages.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { PunCustomId } from "../handlers/component-ids.ts";
import { AplCustomId } from "../../appeals/handlers/component-ids.ts";

const D = punishmentMessages.dm;

function typeLabel(type: string): string {
  return punishmentMessages.labels[type] ?? type;
}

export function buildPunishmentDm(
  punishment: Pick<Punishment, "punishmentId" | "type" | "reason">,
): BaseMessageOptions {
  return {
    content: D.body(punishmentMessages.serverName, typeLabel(punishment.type), punishment.reason),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(PunCustomId.whyInfo(punishment.punishmentId))
          .setLabel(D.whyButton)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(AplCustomId.start(punishment.punishmentId))
          .setLabel(appealMessages.dm.appealButton)
          .setStyle(ButtonStyle.Primary),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

export function buildWhyInfo(
  punishment: Pick<Punishment, "type" | "reason" | "evidence">,
): string {
  return D.whyInfo(typeLabel(punishment.type), punishment.reason, punishment.evidence);
}
