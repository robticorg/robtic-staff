import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
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
import { parseCustomId } from "./component-ids.ts";

const M = modmailMessages;

const log = logger.child("modmail:modal");
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleModmailModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parsed = parseCustomId(interaction.customId);
  if (!parsed) return;

  if (parsed.action === "targetModal") return submitTarget(interaction);
  if (parsed.action === "detailsModal") return submitDetails(interaction);
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
