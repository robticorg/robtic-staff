import { MessageFlags, type GuildMember, type ModalSubmitInteraction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { resolvePrimaryGuild } from "../runtime.ts";
import { dmSessionStore } from "../session/dm-session-store.ts";
import { isSnowflake, resolveReportTarget, TargetKind } from "../services/target-classifier.ts";
import {
  buildEvidencePrompt,
  buildTargetConfirmationStaff,
  buildTargetConfirmationUser,
} from "../render/dm-messages.ts";
import { parseCustomId, ModmailModalField } from "./component-ids.ts";
import { buildReportTransferDm } from "../render/transfer-dm.ts";
import { modmailService } from "../services/modmail.service.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { emojis } from "../../../data/emojis/index.ts";

const M = modmailMessages;

const log = logger.child("modmail:modal");
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleModmailModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parsed = parseCustomId(interaction.customId);
  if (!parsed) return;

  if (parsed.action === "targetModal") return submitTarget(interaction);
  if (parsed.action === "detailsModal") return submitDetails(interaction);
  if (parsed.action === "transferModal") {
    return submitTransfer(interaction, parsed.args[0]);
  }
}

async function submitTarget(interaction: ModalSubmitInteraction): Promise<void> {
  const session = dmSessionStore.get(interaction.user.id);
  if (!session?.draft || session.draft.step !== "TARGET") {
    await interaction.reply({ content: M.wizard.formExpired, ...EPHEMERAL });
    return;
  }

  const rawId = interaction.fields.getTextInputValue("targetId").trim();
  if (!isSnowflake(rawId)) {
    await interaction.reply({ content: M.validation.invalidUserId, ...EPHEMERAL });
    return;
  }
  if (rawId === interaction.user.id) {
    await interaction.reply({ content: M.validation.cannotReportSelf, ...EPHEMERAL });
    return;
  }
  if (rawId === interaction.client.user.id) {
    await interaction.reply({ content: M.validation.cannotReportBot, ...EPHEMERAL });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const guild = resolvePrimaryGuild();
    const resolved = await resolveReportTarget(guild, rawId);

    if (resolved.kind === TargetKind.NOT_IN_GUILD || !resolved.caseType) {
      await interaction.editReply(M.validation.targetNotInGuild);
      return;
    }

    dmSessionStore.updateDraft(interaction.user.id, {
      targetId: rawId,
      targetTag: resolved.member?.user.tag,
      caseType: resolved.caseType,
      step: "DETAILS",
    });

    const mention = `<@${rawId}>`;
    await interaction.editReply(
      resolved.kind === TargetKind.STAFF
        ? buildTargetConfirmationStaff(mention)
        : buildTargetConfirmationUser(mention),
    );
  } catch (err) {
    log.error("target validation failed", err);
    await interaction.editReply(M.validation.targetLookupFailed);
  }
}

async function submitDetails(interaction: ModalSubmitInteraction): Promise<void> {
  const session = dmSessionStore.get(interaction.user.id);
  if (!session?.draft || session.draft.step !== "DETAILS") {
    await interaction.reply({ content: M.wizard.formExpired, ...EPHEMERAL });
    return;
  }

  const reason = interaction.fields.getTextInputValue("reason").trim();
  const description = interaction.fields.getTextInputValue("description").trim();
  if (!reason || !description) {
    await interaction.reply({ content: M.validation.reasonAndDescriptionRequired, ...EPHEMERAL });
    return;
  }

  const draft = dmSessionStore.updateDraft(interaction.user.id, {
    reason,
    description,
    step: "EVIDENCE",
  });
  await interaction.reply({ ...buildEvidencePrompt(draft?.evidence.length ?? 0), ...EPHEMERAL });
}

async function submitTransfer(
  interaction: ModalSubmitInteraction,
  caseId?: string,
): Promise<void> {
  if (!caseId || !interaction.inCachedGuild()) return;

  const targetId = [
    ...(interaction.fields.getSelectedUsers(ModmailModalField.transferTarget)?.keys() ?? []),
  ][0];
  const reason = interaction.fields
    .getTextInputValue(ModmailModalField.transferReason)
    .trim();

  if (!targetId) {
    await interaction.reply({ content: M.transfer.targetMissing, ...EPHEMERAL });
    return;
  }
  if (!reason) {
    await interaction.reply({ content: M.transfer.reasonMissing, ...EPHEMERAL });
    return;
  }

  await interaction.deferReply(EPHEMERAL);
  try {
    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      await interaction.editReply(M.transfer.targetNotInGuild);
      return;
    }

    const result = await modmailService.transferReport({
      caseId,
      actor: interaction.member,
      target,
      reason,
    });

    const delivered = await notifyTransfer(target, {
      caseId,
      guildId: result.case.guildId,
      threadId: result.case.threadId ?? "",
      reason: result.reason,
    });

    await interaction.editReply(
      delivered
        ? M.transfer.done(caseId, target.id)
        : `${M.transfer.done(caseId, target.id)}
${M.transfer.dmFailed(target.id)}`,
    );
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("report transfer failed", err);
    await interaction.editReply(`${emojis.error} ${M.errors.statusUpdateFailed}`);
  }
}

async function notifyTransfer(
  target: GuildMember,
  input: { caseId: string; guildId: string; threadId: string; reason: string },
): Promise<boolean> {
  if (!input.threadId) return false;
  try {
    await target.send(buildReportTransferDm(input));
    return true;
  } catch (err) {
    log.warn(`report transfer DM to ${target.id} failed`, err);
    return false;
  }
}
