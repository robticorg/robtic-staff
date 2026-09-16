import {
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { SupportAudience } from "../services/staff-support-visibility.ts";

const S = staffSupportMessages.support;

const VISIBILITY_NOTE: Record<SupportAudience, string> = {
  [SupportAudience.STAFF_AND_OWNER_MANAGERS]: S.visibilityStaff,
  [SupportAudience.OWNER_MANAGER_ONLY]: S.visibilityOwner,
  [SupportAudience.ADMINISTRATORS_ONLY]: S.visibilityShip,
};

export interface SupportTicketMessageInput {
  ticketId: string;
  userId: string;
  reason: string;
  audience: SupportAudience;
  demission?: boolean;
}

/** The opening message inside a Staff Support / Demission ticket channel. */
export function buildSupportTicketMessage(
  input: SupportTicketMessageInput,
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(
    input.demission ? colors.warning : colors.primary,
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      input.demission
        ? `# ${staffSupportMessages.demission.modalTitle} · \`${input.ticketId}\``
        : S.channelHeader(input.ticketId),
    ),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(S.openedBy(input.userId)),
  );
  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(S.reasonLine(truncate(input.reason, 1500))),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(VISIBILITY_NOTE[input.audience]),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
