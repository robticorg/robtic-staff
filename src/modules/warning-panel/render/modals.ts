import { LabelBuilder, ModalBuilder, TextInputStyle } from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { warnPanelConfig } from "../../../data/warn-panel/config.ts";
import { warnPanelMessages } from "../../../data/warn-panel/messages.ts";
import { WarnPanelCustomId, WarnPanelField } from "../handlers/component-ids.ts";

const M = warnPanelMessages.modal;

/**
 * A native user picker inside the modal — the manager never types an id, so there
 * is no id to mistype or spoof. The submitted selection is still re-resolved and
 * re-authorized server-side.
 */
function userLabel(): LabelBuilder {
  return new LabelBuilder()
    .setLabel(M.user.label)
    .setUserSelectMenuComponent((s) =>
      s
        .setCustomId(WarnPanelField.user)
        .setPlaceholder(M.user.placeholder)
        .setMinValues(1)
        .setMaxValues(1)
        .setRequired(true),
    );
}

function reasonLabel(): LabelBuilder {
  return new LabelBuilder().setLabel(M.reason.label).setTextInputComponent((t) =>
    t
      .setCustomId(WarnPanelField.reason)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(M.reason.placeholder)
      .setMaxLength(limits.reasonMaxLength)
      .setRequired(true),
  );
}

/** Native file upload — managers attach the proof instead of pasting CDN links. */
function evidenceLabel(): LabelBuilder {
  return new LabelBuilder()
    .setLabel(M.evidence.label)
    .setDescription(M.evidence.description(warnPanelConfig.maxEvidenceFiles))
    .setFileUploadComponent((f) =>
      f
        .setCustomId(WarnPanelField.evidence)
        .setMinValues(warnPanelConfig.minEvidenceFiles)
        .setMaxValues(warnPanelConfig.maxEvidenceFiles)
        .setRequired(true),
    );
}

function durationLabel(): LabelBuilder {
  return new LabelBuilder().setLabel(M.duration.label).setTextInputComponent((t) =>
    t
      .setCustomId(WarnPanelField.duration)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(M.duration.placeholder)
      .setMaxLength(32)
      .setRequired(true),
  );
}

export function buildTimeoutModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(WarnPanelCustomId.timeoutModal())
    .setTitle(M.timeoutTitle)
    .addLabelComponents(userLabel(), reasonLabel(), evidenceLabel(), durationLabel());
}

export function buildJailModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(WarnPanelCustomId.jailModal())
    .setTitle(M.jailTitle)
    .addLabelComponents(userLabel(), reasonLabel(), evidenceLabel());
}

export function buildUserWarnModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(WarnPanelCustomId.userWarnModal())
    .setTitle(M.userWarnTitle)
    .addLabelComponents(userLabel(), reasonLabel(), evidenceLabel());
}

/**
 * The checkbox is the modal equivalent of the trailing `=` marker `!warn` uses:
 * unchecked issues a real warning, exactly like `!warn` without the marker.
 */
function verbalLabel(): LabelBuilder {
  return new LabelBuilder()
    .setLabel(M.verbal.label)
    .setDescription(M.verbal.description)
    .setCheckboxComponent((c) => c.setCustomId(WarnPanelField.verbal).setDefault(false));
}

export function buildStaffWarnModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(WarnPanelCustomId.staffWarnModal())
    .setTitle(M.staffWarnTitle)
    .addLabelComponents(userLabel(), reasonLabel(), evidenceLabel(), verbalLabel());
}
