import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { StaffTier, roleConfigService } from "../../modules/configuration/index.ts";
import { getHierarchy } from "../../modules/configuration/utils/staff-levels.ts";
import { DomainError } from "../../shared/utils/errors.ts";
import { STAFF_TIER_LABELS, hierarchyMessages } from "../../data/messages/hierarchy.ts";
import { buildRoleCheckView } from "./check.ts";
import { handleStaffType } from "./staff-type.ts";
import { handleSet } from "./set.ts";
import { handleRange } from "./range.ts";
import { handleList } from "./list.ts";
import { STAFF_TYPE_DEFINITIONS } from "../../data/staff-types/index.ts";
import { STAFF_TIER_KEYWORD_DEFINITIONS } from "../../data/staff-tiers/index.ts";
import {
  CommandName,
  CommandOption,
  RoleSubcommand,
  commandCopy,
} from "../../data/commands/index.ts";
import { ROLE_RANGE_CHOICES, ROLE_SET_CHOICES } from "../../data/roles/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { configMessages } from "../../data/messages/config.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "./responses.ts";

const copy = commandCopy.role;

const data = new SlashCommandBuilder()
  .setName(CommandName.ROLE)
  .setDescription(copy.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.SET)
      .setDescription(copy.sub.set.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.TYPE)
          .setDescription(copy.sub.set.options.type)
          .setRequired(true)
          .addChoices(...ROLE_SET_CHOICES),
      )
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.set.options.role).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.RANGE)
      .setDescription(copy.sub.range.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.TYPE)
          .setDescription(copy.sub.range.options.type)
          .setRequired(true)
          .addChoices(...ROLE_RANGE_CHOICES),
      )
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.range.options.role),
      )
      .addRoleOption((o) =>
        o.setName(CommandOption.FROM).setDescription(copy.sub.range.options.from),
      )
      .addRoleOption((o) => o.setName(CommandOption.TO).setDescription(copy.sub.range.options.to)),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.BOUNDARY)
      .setDescription(copy.sub.boundary.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.TIER)
          .setDescription(copy.sub.boundary.options.tier)
          .setRequired(true)
          .addChoices(
            ...STAFF_TIER_KEYWORD_DEFINITIONS.map((d) => ({
              name: STAFF_TIER_LABELS[d.tier],
              value: d.tier as string,
            })),
          ),
      )
      .addRoleOption((o) =>
        o
          .setName(CommandOption.ROLE)
          .setDescription(copy.sub.boundary.options.role)
          .setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.STAFF_TYPE)
      .setDescription(copy.sub.stafftype.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.TYPE)
          .setDescription(copy.sub.stafftype.options.type)
          .setRequired(true)
          .addChoices(...STAFF_TYPE_DEFINITIONS.map((d) => ({ name: d.label, value: d.slug }))),
      )
      .addRoleOption((o) =>
        o
          .setName(CommandOption.ROLE)
          .setDescription(copy.sub.stafftype.options.role)
          .setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(RoleSubcommand.CHECK)
      .setDescription(copy.sub.check.description)
      .addRoleOption((o) =>
        o.setName(CommandOption.ROLE).setDescription(copy.sub.check.option).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s.setName(RoleSubcommand.LIST).setDescription(copy.sub.list.description),
  );

const STAFF_TYPE_BY_SLUG = new Map(
  STAFF_TYPE_DEFINITIONS.map((definition) => [definition.slug, definition]),
);

const STAFF_TIER_BY_VALUE = new Map<string, StaffTier>(
  STAFF_TIER_KEYWORD_DEFINITIONS.map((d) => [d.tier as string, d.tier]),
);

async function handleBoundary(
  interaction: ChatInputCommandInteraction,
  tier: StaffTier,
): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);
  try {
    await roleConfigService.setBoundary(guild.id, role.id, tier);
  } catch (err) {
    if (err instanceof DomainError && err.message === "BOUNDARY_NOT_ON_LADDER") {
      throw new CommandError(hierarchyMessages.boundary.notOnLadder);
    }
    throw err;
  }
  await replySuccess(
    interaction,
    hierarchyMessages.boundary.configured(STAFF_TIER_LABELS[tier]),
    configMessages.role.roleLine(role.id),
    hierarchyMessages.boundary.note,
  );
}

async function handleCheck(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);

  const hierarchy = await getHierarchy(guild.id);
  const view = buildRoleCheckView(hierarchy, role.id);

  if (!view.ok) throw new CommandError(view.lines.join("\n"));
  await replySuccess(interaction, hierarchyMessages.roleCheck.title, ...view.lines);
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case RoleSubcommand.SET:
        return handleSet(interaction);
      case RoleSubcommand.RANGE:
        return handleRange(interaction);
      case RoleSubcommand.BOUNDARY: {
        const raw = interaction.options.getString(CommandOption.TIER, true);
        const tier = STAFF_TIER_BY_VALUE.get(raw);
        if (!tier) throw new CommandError(commonMessages.errors.unknownSubcommand(raw));
        return handleBoundary(interaction, tier);
      }
      case RoleSubcommand.STAFF_TYPE: {
        const raw = interaction.options.getString(CommandOption.TYPE, true);
        const definition = STAFF_TYPE_BY_SLUG.get(raw);
        if (!definition) throw new CommandError(commonMessages.errors.unknownSubcommand(raw));
        return handleStaffType(interaction, definition);
      }
      case RoleSubcommand.CHECK:
        return handleCheck(interaction);
      case RoleSubcommand.LIST:
        return handleList(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
});
