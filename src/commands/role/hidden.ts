import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { CommandOption } from "../../data/commands/index.ts";
import { HiddenConfigSlot, HIDDEN_CONFIG_SLOT_VALUES } from "../../data/hidden-staff/config.ts";
import { hiddenStaffMessages } from "../../data/hidden-staff/messages.ts";
import { HiddenStaffError, hiddenStaffConfigService } from "../../modules/staff/hidden/index.ts";
import type { HiddenConfigOutcome } from "../../modules/staff/hidden/services/hidden-staff-config.service.ts";
import { CommandError, requireGuild } from "../_shared/guards.ts";

const CFG = hiddenStaffMessages.config;

export const HIDDEN_SET_CHOICES: readonly { name: string; value: string }[] = [
  { name: CFG.startLabel, value: HiddenConfigSlot.START },
  { name: CFG.endLabel, value: HiddenConfigSlot.END },
  { name: CFG.ignoreLabel, value: HiddenConfigSlot.IGNORE },
  { name: CFG.unignoreLabel, value: HiddenConfigSlot.UNIGNORE },
];

export function isHiddenSlot(value: string): boolean {
  return HIDDEN_CONFIG_SLOT_VALUES.includes(value);
}

function ladderLines(outcome: HiddenConfigOutcome): string[] {
  if (!outcome.complete) return [CFG.waitingForOther];
  return [CFG.ladderTitle, ...outcome.hierarchy.levels.map((rung) => CFG.ladderRow(rung.level, rung.roleId))];
}

async function reply(interaction: ChatInputCommandInteraction, lines: readonly string[]): Promise<void> {
  const content = lines.join("\n").slice(0, 2000);
  if (interaction.deferred || interaction.replied) await interaction.editReply({ content, allowedMentions: { parse: [] } });
  else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

export async function handleHiddenSlot(interaction: ChatInputCommandInteraction, slot: string): Promise<void> {
  const guild = requireGuild(interaction);
  const role = interaction.options.getRole(CommandOption.ROLE, true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    switch (slot) {
      case HiddenConfigSlot.START: {
        const outcome = await hiddenStaffConfigService.setStart(guild, role.id);
        return reply(interaction, [CFG.startSet(role.id), ...ladderLines(outcome)]);
      }
      case HiddenConfigSlot.END: {
        const outcome = await hiddenStaffConfigService.setEnd(guild, role.id);
        return reply(interaction, [CFG.endSet(role.id), ...ladderLines(outcome)]);
      }
      case HiddenConfigSlot.IGNORE:
        await hiddenStaffConfigService.ignore(guild, role.id);
        return reply(interaction, [CFG.ignoredAdded(role.id)]);
      case HiddenConfigSlot.UNIGNORE: {
        const removed = await hiddenStaffConfigService.unignore(guild, role.id);
        return reply(interaction, [removed ? CFG.ignoredRemoved(role.id) : CFG.notIgnored(role.id)]);
      }
    }
  } catch (err) {
    if (err instanceof HiddenStaffError) return reply(interaction, [err.message]);
    throw err;
  }
  throw new CommandError(CFG.problems.NOT_CONFIGURED!);
}
