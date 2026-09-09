import {
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketCustomId, TicketModalField } from "../handlers/component-ids.ts";

const M = ticketMessages;

export function buildAddUserModal(ticketId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(TicketCustomId.addUserModal(ticketId))
    .setTitle(M.addUser.modalTitle)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(M.addUser.usersLabel)
        .setUserSelectMenuComponent(
          new UserSelectMenuBuilder()
            .setCustomId(TicketModalField.addUsers)
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(limits.resolvedSelectMaxValues),
        ),
      new LabelBuilder()
        .setLabel(M.addUser.rolesLabel)
        .setRoleSelectMenuComponent(
          new RoleSelectMenuBuilder()
            .setCustomId(TicketModalField.addRoles)
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(limits.resolvedSelectMaxValues),
        ),
    );
}

export interface RemovableEntry {
  value: string;
  label: string;
}

export function buildRemoveUserModal(ticketId: string, entries: RemovableEntry[]): ModalBuilder {
  const options = entries
    .slice(0, limits.selectMenuMaxOptions)
    .map((e) => new StringSelectMenuOptionBuilder().setLabel(e.label.slice(0, 100)).setValue(e.value));

  return new ModalBuilder()
    .setCustomId(TicketCustomId.removeUserModal(ticketId))
    .setTitle(M.removeUser.modalTitle)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(M.removeUser.selectLabel)
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(TicketModalField.removeTargets)
            .setPlaceholder(M.removeUser.selectPlaceholder)
            .setMinValues(1)
            .setMaxValues(Math.max(1, options.length))
            .addOptions(options),
        ),
    );
}
