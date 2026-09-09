import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { vacationConfig } from "../../../data/vacation/config.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { formatDuration } from "../services/duration.ts";
import type { Vacation } from "../models/vacation.model.ts";
import { VacationStatus } from "../types/enums.ts";
import { VacCustomId } from "../handlers/component-ids.ts";

const R = vacationMessages.request;

function accentFor(status: VacationStatus): number {
  const c = vacationConfig.requestAccentColor;
  switch (status) {
    case VacationStatus.APPROVED:
      return c.approved;
    case VacationStatus.ACTIVE:
      return c.active;
    case VacationStatus.REJECTED:
      return c.rejected;
    case VacationStatus.CANCELLED:
      return c.cancelled;
    case VacationStatus.COMPLETED:
      return c.completed;
    default:
      return c.pending;
  }
}

function statusLine(vacation: Pick<Vacation, "status" | "approvedBy" | "rejectedBy">): string {
  switch (vacation.status) {
    case VacationStatus.APPROVED:
      return R.statusApproved(vacation.approvedBy ?? "?");
    case VacationStatus.ACTIVE:
      return R.statusActive(vacation.approvedBy ?? "?");
    case VacationStatus.REJECTED:
      return R.statusRejected(vacation.rejectedBy ?? "?");
    default:
      return R.statusPending;
  }
}

export function buildRequestCard(
  vacation: Pick<
    Vacation,
    | "vacationId"
    | "staffId"
    | "status"
    | "reason"
    | "duration"
    | "durationUnit"
    | "startsAt"
    | "endsAt"
    | "approvedBy"
    | "rejectedBy"
  >,
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(accentFor(vacation.status));
  const durationText = formatDuration({ value: vacation.duration, unit: vacation.durationUnit });

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(R.heading));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        R.staff(vacation.staffId),
        R.duration(durationText),
        R.window(vacation.startsAt, vacation.endsAt),
        R.reason(vacation.reason),
      ].join("\n"),
    ),
  );
  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusLine(vacation)));

  const decided = vacation.status !== VacationStatus.PENDING;
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(VacCustomId.approve(vacation.vacationId))
        .setLabel(R.approveButton)
        .setStyle(ButtonStyle.Success)
        .setDisabled(decided),
      new ButtonBuilder()
        .setCustomId(VacCustomId.refuse(vacation.vacationId))
        .setLabel(R.refuseButton)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(decided),
      new ButtonBuilder()
        .setCustomId(VacCustomId.info(vacation.vacationId))
        .setLabel(R.infoButton)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}
