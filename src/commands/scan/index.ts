import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { hierarchyMessages } from "../../data/messages/hierarchy.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { staffPermissionService } from "../../modules/staff/services/staff-permissions.service.ts";
import {
  StaffScanError,
  staffScanService,
  type ScanReport,
} from "../../modules/staff/services/staff-scan.service.ts";
import type { HierarchyIssue } from "../../modules/configuration/utils/staff-levels.ts";
import { CommandError, requireGuild, requireMember } from "../_shared/guards.ts";
import { replyInfo, replySuccess } from "../_shared/responses.ts";
import { describeHierarchyIssues } from "../role/check.ts";

const M = hierarchyMessages.scan;
const MAX_INVALID_MENTIONS = 10;

const data = new SlashCommandBuilder()
  .setName(CommandName.SCAN)
  .setDescription(commandCopy.scan.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

/** §10 — the summary is ephemeral, so only the executor sees member ids. */
function buildSummary(report: ScanReport): (string | undefined)[] {
  const lines: (string | undefined)[] = [
    M.found(report.found),
    "",
    M.created(report.created),
    M.updated(report.updated),
    M.unchanged(report.unchanged),
    M.errors(report.errors),
  ];

  if (report.invalid > 0) {
    lines.push("", M.invalid(report.invalid), M.invalidHint);
    const sample = report.invalidMembers
      .slice(0, MAX_INVALID_MENTIONS)
      .map((id) => `<@${id}>`)
      .join("، ");
    if (sample) lines.push(M.invalidSample(sample));
  }

  lines.push("", M.note);
  return lines;
}

export default defineCommand({
  data,
  async execute(interaction) {
    const guild = requireGuild(interaction);

    // §9 — reuse the existing Staff Manager permission system (admins included).
    const member = await requireMember(interaction);
    if (!(await staffPermissionService.isStaffManager(member))) {
      throw new CommandError(commonMessages.errors.needAdministrator);
    }

    // A full member fetch on a large guild easily outlives the 3s ack window.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const report = await staffScanService.scan({ guild, actorId: interaction.user.id });

      if (report.found === 0) {
        await replyInfo(interaction, M.nothingFound);
        return;
      }

      await replySuccess(interaction, M.title, ...buildSummary(report));
    } catch (err) {
      if (err instanceof StaffScanError) {
        throw new CommandError(scanErrorMessage(err));
      }
      throw err;
    }
  },
});

function scanErrorMessage(err: StaffScanError): string {
  switch (err.code) {
    case "SCAN_IN_PROGRESS":
      return M.inProgress;
    case "SCAN_STAFF_ROLE_UNSET":
      return M.staffRoleUnset;
    case "SCAN_INVALID_HIERARCHY": {
      const issues = (err.context?.issues ?? []) as HierarchyIssue[];
      return [hierarchyMessages.problems.heading, ...describeHierarchyIssues(issues)].join("\n");
    }
    default:
      return M.failed;
  }
}
