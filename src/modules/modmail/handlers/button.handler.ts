import { MessageFlags, type ButtonInteraction, type GuildMember } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { emojis } from "../../../data/emojis/index.ts";
import { resolvePrimaryGuild } from "../runtime.ts";
import { dmSessionStore } from "../session/dm-session-store.ts";
import { modmailService } from "../services/modmail.service.ts";
import { buildDetailsModal, buildTargetModal } from "./modals.ts";
import { parseCustomId } from "./component-ids.ts";

const log = logger.child("modmail:button");
const M = modmailMessages;

const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleModmailButton(interaction: ButtonInteraction): Promise<void> {
  const parsed = parseCustomId(interaction.customId);
  if (!parsed) return;

  switch (parsed.action) {
    case "menuReport":
      return startReport(interaction);
    case "openDetails":
      return openDetails(interaction);
    case "submit":
      return submitReport(interaction);
    case "cancel":
      return cancelReport(interaction);
    case "claim":
      return claim(interaction, parsed.args[0]);
    case "info":
      return reporterInfo(interaction, parsed.args[0]);
    case "status":
      return changeStatus(interaction, parsed.args[0], parsed.args[1]);
    case "pickCase":
      return pickCase(interaction, parsed.args[0]);
    default:
      return;
  }
}

async function startReport(interaction: ButtonInteraction): Promise<void> {
  const guild = resolvePrimaryGuild();
  dmSessionStore.startDraft(interaction.user.id, guild.id);
  await interaction.showModal(buildTargetModal(interaction.user.id));
}

async function openDetails(interaction: ButtonInteraction): Promise<void> {
  const session = dmSessionStore.get(interaction.user.id);
  if (!session?.draft || session.draft.step !== "DETAILS") {
    await interaction.reply({ content: M.wizard.formExpired, ...EPHEMERAL });
    return;
  }
  await interaction.showModal(buildDetailsModal(interaction.user.id));
}

async function submitReport(interaction: ButtonInteraction): Promise<void> {
  const session = dmSessionStore.get(interaction.user.id);
  const draft = session?.draft;
  if (!draft || draft.step !== "EVIDENCE" || !draft.reason || !draft.description) {
    await interaction.reply({ content: M.wizard.notReady, ...EPHEMERAL });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const { case: kase } = await modmailService.submitReport(draft, { id: interaction.user.id });
    dmSessionStore.clearDraft(interaction.user.id);
    dmSessionStore.setActiveCase(interaction.user.id, kase.caseId);
    await interaction.editReply(M.wizard.submittedShort(kase.caseId));
  } catch (err) {
    await interaction.editReply(friendlyError(err, M.errors.submitFailed));
  }
}

async function cancelReport(interaction: ButtonInteraction): Promise<void> {
  dmSessionStore.clearDraft(interaction.user.id);
  await interaction.reply({ content: M.wizard.cancelled, ...EPHEMERAL });
}

async function pickCase(interaction: ButtonInteraction, caseId?: string): Promise<void> {
  if (!caseId) return;
  dmSessionStore.setActiveCase(interaction.user.id, caseId);
  await interaction.reply({ content: M.dm.caseSwitched(caseId), ...EPHEMERAL });
}

async function claim(interaction: ButtonInteraction, caseId?: string): Promise<void> {
  if (!caseId) return;
  const member = await fetchMember(interaction);
  if (!member) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const result = await modmailService.claim(caseId, member);
    await interaction.editReply(
      result.pointAwarded ? M.claim.awarded(caseId) : M.claim.alreadyHandler(caseId),
    );
  } catch (err) {
    await interaction.editReply(friendlyError(err, M.errors.claimFailed));
  }
}

async function reporterInfo(interaction: ButtonInteraction, caseId?: string): Promise<void> {
  if (!caseId) return;
  const member = await fetchMember(interaction);
  if (!member) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const info = await modmailService.reporterInfo(caseId, member);
    await interaction.editReply(
      [
        M.info.title,
        "",
        M.info.userLine(info.mention, info.tag),
        M.info.idLine(info.userId),
        M.info.createdLine(Math.floor(info.createdAt.getTime() / 1000)),
      ].join("\n"),
    );
  } catch (err) {
    await interaction.editReply(friendlyError(err, M.errors.reporterInfoFailed));
  }
}

async function changeStatus(
  interaction: ButtonInteraction,
  caseId?: string,
  to?: string,
): Promise<void> {
  if (!caseId || !to) return;
  const member = await fetchMember(interaction);
  if (!member) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const updated = await modmailService.transition(caseId, member, to as never);
    await interaction.editReply(M.status.changed(caseId, updated.status));
  } catch (err) {
    await interaction.editReply(friendlyError(err, M.errors.statusUpdateFailed));
  }
}

async function fetchMember(interaction: ButtonInteraction): Promise<GuildMember | null> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: commonMessages.errors.guildOnlyAction, ...EPHEMERAL });
    return null;
  }
  try {
    return await interaction.guild.members.fetch(interaction.user.id);
  } catch {
    await interaction.reply({ content: commonMessages.errors.membershipUnverified, ...EPHEMERAL });
    return null;
  }
}

function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof DomainError) {
    if (err.code === "VALIDATION_ERROR" || err.code === "CONFLICT" || err.code.endsWith("_NOT_CONFIGURED")) {
      return `${emojis.error} ${err.message}`;
    }
    if (err.code === "MODMAIL_CASE_NOT_FOUND") return `${emojis.error} ${M.errors.caseGone}`;
  }
  log.error(fallback, err);
  return `${emojis.error} ${fallback}`;
}
