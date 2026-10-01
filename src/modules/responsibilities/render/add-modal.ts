import {
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  RESPONSIBILITY_PERMISSIONS,
  RESPONSIBILITY_PERMISSION_LABELS,
  responsibilityLimits as L,
} from "../../../data/responsibilities/config.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { ResponsibilityCustomId, ResponsibilityField } from "../handlers/component-ids.ts";

const M = responsibilityMessages.modal;

export function buildAddResponsibilityModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(ResponsibilityCustomId.addModal())
    .setTitle(M.title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(M.roleLabel)
        .setDescription(M.roleDescription)
        .setRoleSelectMenuComponent(
          new RoleSelectMenuBuilder()
            .setCustomId(ResponsibilityField.role)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
      new LabelBuilder()
        .setLabel(M.permissionLabel)
        .setDescription(M.permissionDescription)
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(ResponsibilityField.permission)
            .setPlaceholder(M.permissionPlaceholder)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true)
            .addOptions(
              RESPONSIBILITY_PERMISSIONS.map((permission) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(RESPONSIBILITY_PERMISSION_LABELS[permission] ?? permission)
                  .setDescription(permission)
                  .setValue(permission),
              ),
            ),
        ),
      new LabelBuilder().setLabel(M.titleLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(ResponsibilityField.title)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(M.titlePlaceholder)
          .setMaxLength(L.titleMaxLength)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(M.descriptionLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(ResponsibilityField.description)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(M.descriptionPlaceholder)
          .setMaxLength(L.descriptionMaxLength)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(M.durationLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(ResponsibilityField.duration)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(M.durationPlaceholder)
          .setMaxLength(20)
          .setRequired(false),
      ),
    );
}
