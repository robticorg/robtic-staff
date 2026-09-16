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
import { colors } from "../../../data/config/colors.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import {
  StaffSupportRequestStatus,
  type StaffSupportRequest,
} from "../models/staff-support-request.model.ts";
import { StaffSupportCustomId } from "../handlers/component-ids.ts";

const D = staffSupportMessages.demission;

type CardInput = Pick<
  StaffSupportRequest,
  | "requestId"
  | "staffId"
  | "reason"
  | "status"
  | "snapshotLevel"
  | "snapshotTier"
  | "ticketChannelId"
  | "handledBy"
>;

export function buildDemissionCard(request: CardInput): BaseMessageOptions {
  const done = request.status !== StaffSupportRequestStatus.OPEN;

  const container = new ContainerBuilder().setAccentColor(
    done ? colors.neutral : colors.warning,
  );

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(D.cardTitle));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(D.cardStaff(request.staffId)),
  );
  if (typeof request.snapshotLevel === "number") {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(D.cardLevel(request.snapshotLevel)),
    );
  }
  if (request.snapshotTier) {
    const label = staffSupportMessages.tier[request.snapshotTier] ?? request.snapshotTier;
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(D.cardTier(label)));
  }
  if (request.ticketChannelId) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(D.cardTicket(request.ticketChannelId)),
    );
  }

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(D.cardReason(truncate(request.reason, 1200))),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      done ? D.statusDone(request.handledBy ?? "?") : D.statusPending,
    ),
  );

  if (!done) {
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(StaffSupportCustomId.fire(request.requestId))
          .setLabel(D.fireButton)
          .setStyle(ButtonStyle.Danger),
      ),
    );
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
