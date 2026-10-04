import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { staffApplicationConfig } from "../../../data/staff-application/config.ts";
import {
  DEPARTMENT_LABELS,
  GENDER_LABELS,
  staffApplicationMessages,
} from "../../../data/staff-application/messages.ts";
import { ApplicationCustomId, ApplicationField } from "../shared/component-ids.ts";
import { APPLICANT_GENDER_VALUES, APPLICATION_DEPARTMENT_VALUES } from "../shared/enums.ts";
import type { FlowMessageInput } from "./flow-message.ts";

const A = staffApplicationMessages.apply;
const T = staffApplicationMessages.transfer;

export function applyIntroStep(): FlowMessageInput {
  return {
    blocks: A.intro,
    button: { customId: ApplicationCustomId.startApply(), label: A.startButton },
  };
}

export function genderStep(): FlowMessageInput {
  return {
    blocks: [A.genderPrompt],
    select: {
      customId: ApplicationCustomId.gender(),
      placeholder: A.genderPlaceholder,
      options: APPLICANT_GENDER_VALUES.map((value) => ({
        value,
        label: GENDER_LABELS[value] ?? value,
      })),
    },
  };
}

export function departmentStep(girl: boolean): FlowMessageInput {
  return {
    blocks: girl ? [A.girlNotice, A.departmentPrompt] : [A.departmentPrompt],
    select: {
      customId: ApplicationCustomId.department(),
      placeholder: A.departmentPlaceholder,
      options: APPLICATION_DEPARTMENT_VALUES.map((value) => ({
        value,
        label: DEPARTMENT_LABELS[value] ?? value,
      })),
    },
  };
}

export function transferIntroStep(): FlowMessageInput {
  return {
    blocks: T.intro,
    button: { customId: ApplicationCustomId.startTransfer(), label: T.startButton },
  };
}

export function evidenceStep(belowMinimum: string | null): FlowMessageInput {
  const rules = staffApplicationConfig.evidence;
  const blocks = [...T.evidencePrompt(rules.minFiles, rules.maxFiles)];
  if (belowMinimum) blocks.push(belowMinimum);
  return {
    blocks,
    button: { customId: ApplicationCustomId.evidenceButton(), label: T.evidenceButton },
  };
}

export function statusStep(line: string): FlowMessageInput {
  return { blocks: [line] };
}

function textField(
  label: string,
  id: string,
  placeholder: string,
  options: { max: number; required?: boolean; style?: TextInputStyle },
): LabelBuilder {
  return new LabelBuilder().setLabel(label).setTextInputComponent(
    new TextInputBuilder()
      .setCustomId(id)
      .setStyle(options.style ?? TextInputStyle.Short)
      .setPlaceholder(placeholder)
      .setMaxLength(options.max)
      .setRequired(options.required ?? true),
  );
}

export function buildTransferInfoModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(ApplicationCustomId.transferModal())
    .setTitle(T.modalTitle)
    .addLabelComponents(
      textField(T.inviteLabel, ApplicationField.invite, T.invitePlaceholder, { max: 120 }),
    );
}

export function buildEvidenceModal(): ModalBuilder {
  const rules = staffApplicationConfig.evidence;
  return new ModalBuilder()
    .setCustomId(ApplicationCustomId.evidenceModal())
    .setTitle(T.evidenceModalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(T.evidenceLabel).setFileUploadComponent(
        new FileUploadBuilder()
          .setCustomId(ApplicationField.evidence)
          .setMinValues(rules.minFiles)
          .setMaxValues(rules.maxFiles)
          .setRequired(true),
      ),
    );
}
