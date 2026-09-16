import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import {
  CommandName,
  CommandOption,
  FaqSubcommand,
  commandCopy,
} from "../../data/commands/index.ts";
import { ticketMessages } from "../../data/messages/tickets.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { DomainError } from "../../shared/utils/errors.ts";
import { logger } from "../../shared/utils/logger.ts";
import { faqService, ticketConfigService } from "../../modules/tickets/index.ts";
import { buildFaqAddModal } from "../../modules/tickets/handlers/faq-modal.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:faq");
const M = ticketMessages.faq;

const data = new SlashCommandBuilder()
  .setName(CommandName.FAQ)
  .setDescription(commandCopy.faq.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(FaqSubcommand.ADD)
      .setDescription(commandCopy.faq.sub.add.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.PANEL)
          .setDescription(commandCopy.faq.sub.add.option)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(FaqSubcommand.REMOVE)
      .setDescription(commandCopy.faq.sub.remove.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.FAQ)
          .setDescription(commandCopy.faq.sub.remove.option)
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((s) => s.setName(FaqSubcommand.LIST).setDescription(commandCopy.faq.sub.list.description))
  .addSubcommand((s) =>
    s
      .setName(FaqSubcommand.ASSIGN)
      .setDescription(commandCopy.faq.sub.assign.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.FAQ)
          .setDescription(commandCopy.faq.sub.assign.options.faq)
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((o) =>
        o
          .setName(CommandOption.PANEL)
          .setDescription(commandCopy.faq.sub.assign.options.panel)
          .setAutocomplete(true),
      ),
  );

function panelScopeLabel(panelIds: string[]): string {
  if (panelIds.length === 0) return M.scopeAll;
  return panelIds
    .map((id) => ticketConfigService.getPanel(id)?.name ?? id)
    .join("، ");
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const entries = await faqService.list(guild.id);
  const body =
    entries.length === 0
      ? M.empty
      : [
          M.listTitle,
          "",
          ...entries.map((f, i) => M.listLine(i + 1, f.question, panelScopeLabel(f.panelIds))),
        ].join("\n");
  await interaction.reply({ content: body, flags: MessageFlags.Ephemeral });
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const faqId = interaction.options.getString(CommandOption.FAQ, true);
  try {
    const removed = await faqService.remove(guild.id, faqId);
    await interaction.reply({ content: M.removed(removed.question), flags: MessageFlags.Ephemeral });
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.reply({ content: M.notFound, flags: MessageFlags.Ephemeral });
      return;
    }
    throw err;
  }
}

async function handleAssign(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const faqId = interaction.options.getString(CommandOption.FAQ, true);
  const panelId = interaction.options.getString(CommandOption.PANEL);

  if (panelId && !ticketConfigService.getPanel(panelId)) {
    throw new CommandError(M.unknownPanel);
  }

  try {
    const updated = await faqService.assignPanel(guild.id, faqId, panelId);
    await interaction.reply({
      content: M.assigned(updated.question, panelScopeLabel(updated.panelIds)),
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.reply({ content: M.notFound, flags: MessageFlags.Ephemeral });
      return;
    }
    throw err;
  }
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case FaqSubcommand.ADD: {
        const panelId = interaction.options.getString(CommandOption.PANEL) ?? "";
        if (panelId && !ticketConfigService.getPanel(panelId)) {
          throw new CommandError(M.unknownPanel);
        }
        await interaction.showModal(buildFaqAddModal(panelId));
        return;
      }
      case FaqSubcommand.REMOVE:
        return handleRemove(interaction);
      case FaqSubcommand.LIST:
        return handleList(interaction);
      case FaqSubcommand.ASSIGN:
        return handleAssign(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
  async autocomplete(interaction) {
    if (!interaction.inGuild()) {
      await interaction.respond([]);
      return;
    }
    const focused = interaction.options.getFocused(true);
    try {
      if (focused.name === CommandOption.PANEL) {
        const query = String(focused.value).toLowerCase();
        const matches = ticketConfigService
          .listPanels()
          .filter((p) => p.name.toLowerCase().includes(query))
          .slice(0, 25);
        await interaction.respond(matches.map((p) => ({ name: p.name, value: p.id })));
        return;
      }
      if (focused.name === CommandOption.FAQ) {
        const matches = await faqService.search(interaction.guildId, String(focused.value));
        await interaction.respond(
          matches.map((f) => ({ name: f.question.slice(0, 100), value: f.faqId })),
        );
        return;
      }
      await interaction.respond([]);
    } catch (err) {
      log.warn("faq autocomplete failed", err);
      await interaction.respond([]);
    }
  },
});
