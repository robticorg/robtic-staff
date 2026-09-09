import type { Message } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { resolvePrimaryGuild } from "../runtime.ts";
import { dmSessionStore } from "../session/dm-session-store.ts";
import { routeDm } from "../flow/dm-routing.ts";
import { modmailCaseService } from "../services/modmail-case.service.ts";
import { modmailService } from "../services/modmail.service.ts";
import { buildCaseChoice, buildDmMenu, buildEvidenceAck, buildEvidencePrompt } from "../render/dm-messages.ts";
import { extractAttachments } from "./attachment-extract.ts";

const log = logger.child("modmail:dm");
const M = modmailMessages;
const CANCEL_WORDS = new Set(["cancel", "stop", "abort", "الغاء", "إلغاء", "توقف", "الغِ"]);
const SUBMIT_WORDS = new Set(["submit", "done", "send", "ارسال", "إرسال", "تم", "خلصت"]);

export async function handleDirectMessage(message: Message): Promise<void> {
  if (message.author.bot) return;

  const userId = message.author.id;
  const session = dmSessionStore.get(userId);
  const content = message.content.trim();

  if (session?.draft && CANCEL_WORDS.has(content.toLowerCase())) {
    dmSessionStore.clearDraft(userId);
    await reply(message, M.wizard.cancelled);
    return;
  }

  let guildId: string;
  try {
    guildId = session?.draft?.guildId ?? resolvePrimaryGuild().id;
  } catch (err) {
    log.error("no community guild available for DM", err);
    await reply(message, M.dm.notSetUp);
    return;
  }

  const openCases = await modmailCaseService.getOpenCasesForUser(guildId, userId);
  const route = routeDm({
    hasDraft: !!session?.draft,
    activeCaseId: session?.activeCaseId,
    openCaseIds: openCases.map((c) => c.caseId),
  });

  switch (route.kind) {
    case "WIZARD":
      return handleWizardInput(message);
    case "RELAY":
      return relay(message, route.caseId);
    case "CHOOSE_CASE":
      await message.author.send(buildCaseChoice(route.caseIds)).catch((err: unknown) => log.warn("DM send failed", err));
      return;
    case "MENU":
      await message.author.send(buildDmMenu()).catch((err: unknown) => log.warn("DM send failed", err));
      return;
  }
}

async function handleWizardInput(message: Message): Promise<void> {
  const userId = message.author.id;
  const session = dmSessionStore.get(userId);
  const draft = session?.draft;
  if (!draft) return;

  if (draft.step !== "EVIDENCE") {
    await reply(message, M.wizard.useButton);
    return;
  }

  const attachments = extractAttachments(message);
  const word = message.content.trim().toLowerCase();

  if (attachments.length === 0) {
    if (SUBMIT_WORDS.has(word)) {
      await message.author
        .send(buildEvidencePrompt(draft.evidence.length))
        .catch((err: unknown) => log.warn("DM send failed", err));
      return;
    }
    await reply(message, M.wizard.sendAttachments);
    return;
  }

  const count = dmSessionStore.addEvidence(userId, attachments);
  await reply(message, buildEvidenceAck(count));
}

async function relay(message: Message, caseId: string): Promise<void> {
  try {
    await modmailService.relayUserToStaff({
      caseId,
      reporterId: message.author.id,
      content: message.content ?? "",
      attachments: extractAttachments(message),
      sourceMessageId: message.id,
    });
    await message.react(M.reactions.relayed).catch(() => undefined);
  } catch (err) {
    if (err instanceof DomainError) {
      await reply(message, M.dm.relayFailed);
    } else {
      log.error("user→staff relay failed", err);
      await reply(message, M.dm.relayError);
    }
  }
}

async function reply(message: Message, content: string): Promise<void> {
  await message.author.send({ content }).catch((err: unknown) => log.warn("DM reply failed", err));
}
