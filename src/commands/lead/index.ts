import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type SlashCommandStringOption,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, LeadSubcommand } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { leadMessages } from "../../data/leads/messages.ts";
import { logger } from "../../shared/utils/logger.ts";
import { DomainError } from "../../shared/utils/errors.ts";
import {
  LeadHolderType,
  LeadTargetType,
  describeHolder,
  leadAssignmentService,
  leadService,
  type LeadHolder,
  type LeadTarget,
} from "../../modules/leads/index.ts";
import { responsibilityService } from "../../modules/responsibilities/index.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:lead");
const M = leadMessages.command;
const E = leadMessages.errors;
const NAME_MAX = 60;
const DESCRIPTION_MAX = 200;

const leadOption = (o: SlashCommandStringOption) =>
  o.setName(CommandOption.LEAD).setDescription(M.lead).setRequired(true).setAutocomplete(true);

const data = new SlashCommandBuilder()
  .setName(CommandName.LEAD)
  .setDescription(M.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(LeadSubcommand.CREATE)
      .setDescription(M.create)
      .addStringOption((o) =>
        o.setName(CommandOption.NAME).setDescription(M.name).setRequired(true).setMaxLength(NAME_MAX),
      )
      .addStringOption((o) =>
        o
          .setName(CommandOption.DESCRIPTION)
          .setDescription(M.descriptionOption)
          .setRequired(true)
          .setMaxLength(DESCRIPTION_MAX),
      )
      .addUserOption((o) => o.setName(CommandOption.TARGET_USER).setDescription(M.targetUser))
      .addRoleOption((o) => o.setName(CommandOption.TARGET_ROLE).setDescription(M.targetRole))
      .addStringOption((o) =>
        o
          .setName(CommandOption.TARGET_RESPONSIBILITY)
          .setDescription(M.targetResponsibility)
          .setAutocomplete(true),
      )
      .addUserOption((o) => o.setName(CommandOption.LEAD_USER).setDescription(M.holderUser))
      .addRoleOption((o) => o.setName(CommandOption.LEAD_ROLE).setDescription(M.holderRole)),
  )
  .addSubcommand((s) =>
    s
      .setName(LeadSubcommand.ASSIGN)
      .setDescription(M.assign)
      .addStringOption(leadOption)
      .addUserOption((o) => o.setName(CommandOption.USER).setDescription(M.holderUser))
      .addRoleOption((o) => o.setName(CommandOption.ROLE).setDescription(M.holderRole))
      .addBooleanOption((o) => o.setName(CommandOption.REPLACE).setDescription(M.replace)),
  )
  .addSubcommand((s) => s.setName(LeadSubcommand.REMOVE).setDescription(M.remove).addStringOption(leadOption))
  .addSubcommand((s) => s.setName(LeadSubcommand.LIST).setDescription(M.list))
  .addSubcommand((s) => s.setName(LeadSubcommand.INFO).setDescription(M.info).addStringOption(leadOption));

function readTarget(interaction: ChatInputCommandInteraction): LeadTarget {
  const user = interaction.options.getUser(CommandOption.TARGET_USER);
  const role = interaction.options.getRole(CommandOption.TARGET_ROLE);
  const responsibility = interaction.options.getString(CommandOption.TARGET_RESPONSIBILITY);
  const picked = [user, role, responsibility].filter((v) => v !== null);
  if (picked.length !== 1) throw new CommandError(E.oneTarget);
  if (user) return { type: LeadTargetType.USER, id: user.id };
  if (role) return { type: LeadTargetType.ROLE, id: role.id };
  return { type: LeadTargetType.RESPONSIBILITY, id: responsibility! };
}

function readHolder(interaction: ChatInputCommandInteraction, userOption: string, roleOption: string): LeadHolder | null {
  const user = interaction.options.getUser(userOption);
  const role = interaction.options.getRole(roleOption);
  if (user && role) throw new CommandError(E.oneHolder);
  if (user) {
    if (user.bot) throw new CommandError(E.bot);
    return { type: LeadHolderType.USER, id: user.id };
  }
  if (role) return { type: LeadHolderType.ROLE, id: role.id };
  return null;
}

const quiet = { parse: [] as never[] };

async function reply(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  await interaction.editReply({ content, allowedMentions: quiet });
}

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const target = readTarget(interaction);
  const holder = readHolder(interaction, CommandOption.LEAD_USER, CommandOption.LEAD_ROLE);
  if (holder) await leadAssignmentService.validateHolder(guild, holder);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const lead = await leadService.createLead({
    guild,
    name: interaction.options.getString(CommandOption.NAME, true),
    description: interaction.options.getString(CommandOption.DESCRIPTION, true),
    target,
    createdBy: interaction.user.id,
  });
  if (holder) {
    await leadAssignmentService.assignLead({
      guild,
      leadId: lead.leadId,
      holder,
      replace: false,
      actorId: interaction.user.id,
    });
  }
  await reply(
    interaction,
    leadMessages.created(lead.name, await leadService.describeTarget(guild.id, target), holder ? describeHolder(holder) : null),
  );
}

async function handleAssign(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const holder = readHolder(interaction, CommandOption.USER, CommandOption.ROLE);
  if (!holder) throw new CommandError(E.holderRequired);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const leadId = interaction.options.getString(CommandOption.LEAD, true);
  const lead = await leadService.requireLead(guild.id, leadId);
  const result = await leadAssignmentService.assignLead({
    guild,
    leadId: lead.leadId,
    holder,
    replace: interaction.options.getBoolean(CommandOption.REPLACE) ?? false,
    actorId: interaction.user.id,
  });
  await reply(
    interaction,
    result.kind === "REPLACED"
      ? leadMessages.replaced(lead.name, describeHolder(result.previous), describeHolder(holder))
      : leadMessages.assigned(lead.name, describeHolder(holder)),
  );
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const lead = await leadService.requireLead(guild.id, interaction.options.getString(CommandOption.LEAD, true));
  const closed = await leadAssignmentService.removeLead({ guild, leadId: lead.leadId, actorId: interaction.user.id });
  await reply(interaction, leadMessages.removed(lead.name, describeHolder({ type: closed.holderType, id: closed.holderId })));
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const [leads, holders] = await Promise.all([
    leadService.getLeads(guild.id),
    leadAssignmentService.activeHolders(guild.id),
  ]);
  if (leads.length === 0) return reply(interaction, leadMessages.list.empty);
  const byLead = new Map(holders.map((h) => [h.leadId, h]));
  const rows = await Promise.all(
    leads.map(async (l) => {
      const h = byLead.get(l.leadId);
      return leadMessages.list.row(
        l.name,
        await leadService.describeTarget(guild.id, { type: l.targetType, id: l.targetId }),
        h ? describeHolder({ type: h.holderType, id: h.holderId }) : null,
      );
    }),
  );
  await reply(interaction, [leadMessages.list.title, ...rows].join("\n").slice(0, 2000));
}

async function handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const lead = await leadService.requireLead(guild.id, interaction.options.getString(CommandOption.LEAD, true));
  const [current, history] = await Promise.all([
    leadAssignmentService.currentHolder(guild.id, lead.leadId),
    leadAssignmentService.history(guild.id, lead.leadId),
  ]);
  const I = leadMessages.info;
  const lines = [
    I.title(lead.name),
    I.description(lead.description),
    I.target(await leadService.describeTarget(guild.id, { type: lead.targetType, id: lead.targetId })),
    I.holder(current ? describeHolder({ type: current.holderType, id: current.holderId }) : null),
    I.historyHeading,
    ...(history.length
      ? history.map((h) =>
          I.historyRow(
            describeHolder({ type: h.holderType, id: h.holderId }),
            I.statuses[h.status] ?? h.status,
            h.assignedBy,
            h.assignedAt,
            h.removedAt ?? null,
          ),
        )
      : [I.none]),
  ];
  await reply(interaction, lines.join("\n").slice(0, 2000));
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);
    const sub = interaction.options.getSubcommand();
    try {
      switch (sub) {
        case LeadSubcommand.CREATE:
          return await handleCreate(interaction);
        case LeadSubcommand.ASSIGN:
          return await handleAssign(interaction);
        case LeadSubcommand.REMOVE:
          return await handleRemove(interaction);
        case LeadSubcommand.LIST:
          return await handleList(interaction);
        case LeadSubcommand.INFO:
          return await handleInfo(interaction);
        default:
          throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
      }
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      if (interaction.deferred || interaction.replied) {
        await reply(interaction, err.message);
        return;
      }
      throw new CommandError(err.message);
    }
  },
  async autocomplete(interaction) {
    try {
      if (!interaction.inGuild()) return void (await interaction.respond([]));
      const focused = interaction.options.getFocused(true);
      const query = String(focused.value).trim().toLowerCase();
      if (focused.name === CommandOption.TARGET_RESPONSIBILITY) {
        const all = await responsibilityService.getResponsibilities(interaction.guildId);
        await interaction.respond(
          all
            .filter((r) => !query || r.title.toLowerCase().includes(query))
            .slice(0, 25)
            .map((r) => ({ name: r.title.slice(0, 100), value: r.responsibilityId })),
        );
        return;
      }
      const leads = await leadService.search(interaction.guildId, query);
      await interaction.respond(leads.map((l) => ({ name: l.name.slice(0, 100), value: l.leadId })));
    } catch (err) {
      log.warn("lead autocomplete failed", err);
      await interaction.respond([]).catch(() => undefined);
    }
  },
});
