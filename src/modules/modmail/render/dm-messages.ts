import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { emojis } from "../../../data/emojis/index.ts";
import { limits } from "../../../data/config/limits.ts";
import { CustomId } from "../handlers/component-ids.ts";

const M = modmailMessages;

export function buildDmMenu(): BaseMessageOptions {
  return {
    content: [M.menu.title, "", M.menu.prompt].join("\n"),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CustomId.menuReport())
          .setLabel(M.menu.reportButton)
          .setEmoji(emojis.report)
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}

export function buildTargetConfirmationUser(targetMention: string): BaseMessageOptions {
  return {
    content: M.wizard.targetConfirmUser(targetMention),
    components: [continueRow()],
    allowedMentions: { parse: [] },
  };
}

export function buildTargetConfirmationStaff(targetMention: string): BaseMessageOptions {
  return {
    content: M.wizard.targetConfirmStaff(targetMention),
    components: [continueRow()],
    allowedMentions: { parse: [] },
  };
}

function continueRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.openDetails("self"))
      .setLabel(M.wizard.continueButton)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CustomId.cancel("self"))
      .setLabel(M.wizard.cancelButton)
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildEvidencePrompt(evidenceCount: number): BaseMessageOptions {
  return {
    content: [
      ...M.wizard.evidencePrompt,
      M.wizard.evidenceCollected(evidenceCount),
      "",
      M.wizard.evidenceFinish,
    ].join("\n"),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CustomId.submit("self"))
          .setLabel(M.wizard.submitButton)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(CustomId.cancel("self"))
          .setLabel(M.wizard.cancelButton)
          .setStyle(ButtonStyle.Danger),
      ),
    ],
  };
}

export function buildEvidenceAck(count: number): string {
  return M.wizard.evidenceAck(count);
}

export function buildReportSubmitted(caseId: string): string {
  return M.wizard.submitted(caseId);
}

export function renderStaffMessageForDm(caseId: string, content: string): string {
  return M.dm.staffRelay(caseId, content);
}

export function buildCaseChoice(caseIds: readonly string[]): BaseMessageOptions {
  return {
    content: M.dm.chooseCase,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...caseIds.slice(0, limits.caseChoiceButtons).map((caseId) =>
          new ButtonBuilder()
            .setCustomId(CustomId.pickCase(caseId))
            .setLabel(caseId)
            .setStyle(ButtonStyle.Secondary),
        ),
      ),
    ],
  };
}

export function buildCaseClosedNotice(caseId: string): string {
  return M.dm.caseClosedNotice(caseId);
}
