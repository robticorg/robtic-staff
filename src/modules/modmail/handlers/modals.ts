import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { limits } from "../../../data/config/limits.ts";
import { CustomId } from "./component-ids.ts";

const W = modmailMessages.wizard;

export function buildTargetModal(ownerId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CustomId.targetModal(ownerId))
    .setTitle(W.targetModalTitle)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("targetId")
          .setLabel(W.targetModalLabel)
          .setPlaceholder(W.targetModalPlaceholder)
          .setStyle(TextInputStyle.Short)
          .setMinLength(limits.userIdMinLength)
          .setMaxLength(limits.userIdMaxLength)
          .setRequired(true),
      ),
    );
}

export function buildDetailsModal(ownerId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CustomId.detailsModal(ownerId))
    .setTitle(W.detailsModalTitle)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel(W.reasonLabel)
          .setPlaceholder(W.reasonPlaceholder)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(limits.reasonMaxLength)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel(W.descriptionLabel)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(limits.descriptionMaxLength)
          .setRequired(true),
      ),
    );
}
