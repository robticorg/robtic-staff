import {
  CheckboxBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import {
  APPLICATION_TYPE_LABELS,
  staffApplicationMessages,
} from "../../../data/staff-application/messages.ts";
import { ApplicationCustomId, ApplicationField } from "../shared/component-ids.ts";
import { APPLICATION_TYPE_VALUES } from "../shared/enums.ts";

const F = staffApplicationMessages.firstModal;

export function buildFirstModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(ApplicationCustomId.firstModal())
    .setTitle(F.title)
    .addLabelComponents(
      new LabelBuilder().setLabel(F.identityLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(ApplicationField.identity)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(F.identityPlaceholder)
          .setMinLength(3)
          .setMaxLength(200)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(F.typeLabel).setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId(ApplicationField.type)
          .setPlaceholder(F.typePlaceholder)
          .setMinValues(1)
          .setMaxValues(1)
          .setRequired(true)
          .addOptions(
            APPLICATION_TYPE_VALUES.map((value) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(APPLICATION_TYPE_LABELS[value] ?? value)
                .setValue(value),
            ),
          ),
      ),
      new LabelBuilder()
        .setLabel(F.recruiterLabel)
        .setDescription(F.recruiterDescription)
        .setUserSelectMenuComponent(
          new UserSelectMenuBuilder()
            .setCustomId(ApplicationField.recruiter)
            .setMinValues(0)
            .setMaxValues(1)
            .setRequired(false),
        ),
      new LabelBuilder()
        .setLabel(F.termsLabel)
        .setCheckboxComponent(new CheckboxBuilder().setCustomId(ApplicationField.terms)),
    );
}
