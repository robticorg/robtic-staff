import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { appealMessages } from "../../../data/appeals/messages.ts";
import { AplCustomId, AplModalField } from "../handlers/component-ids.ts";

const D = appealMessages.dm;
const R = appealMessages.review;

export function buildAppealModal(punishmentId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(AplCustomId.appealModal(punishmentId))
    .setTitle(D.modalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(D.reasonLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(AplModalField.reason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(D.reasonPlaceholder)
          .setMaxLength(1800)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(D.evidenceLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(AplModalField.evidence)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(D.evidencePlaceholder)
          .setMaxLength(1000)
          .setRequired(false),
      ),
    );
}

export function buildDecisionModal(appealId: string, decision: "accept" | "reject"): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(AplCustomId.decisionModal(appealId, decision))
    .setTitle(decision === "accept" ? R.decisionModalTitleAccept : R.decisionModalTitleReject)
    .addLabelComponents(
      new LabelBuilder().setLabel(R.decisionReasonLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(AplModalField.decisionReason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(R.decisionReasonPlaceholder)
          .setMaxLength(1800)
          .setRequired(true),
      ),
    );
}
