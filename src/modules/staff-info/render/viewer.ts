import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} from "discord.js";
import { staffInfoMessages } from "../../../data/staff-info/messages.ts";
import { StaffInfoCustomId } from "../handlers/component-ids.ts";

const V = staffInfoMessages.viewer;

export interface ViewerInfo {
  infoId: string;
  name: string;
  pages: readonly string[];
}

/** Clamp to a real page (1-based). */
export function clampPage(page: number, pages: number): number {
  return Math.min(Math.max(1, Math.trunc(page) || 1), Math.max(1, pages));
}

/**
 * One page of an info, shown only to the member who picked it. A single-page
 * info has no buttons; otherwise السابق / التالي, disabled at the ends.
 */
export function buildInfoPage(info: ViewerInfo, requestedPage: number) {
  const total = info.pages.length;
  const page = clampPage(requestedPage, total);
  const container = new ContainerBuilder();

  container.addTextDisplayComponents((t) => t.setContent(`## ${info.name}`));
  container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((t) => t.setContent(info.pages[page - 1] ?? ""));

  if (total > 1) {
    container.addTextDisplayComponents((t) => t.setContent(V.pageFooter(page, total)));
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(StaffInfoCustomId.page(info.infoId, page - 1))
          .setLabel(V.previous)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 1),
        new ButtonBuilder()
          .setCustomId(StaffInfoCustomId.page(info.infoId, page + 1))
          .setLabel(V.next)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= total),
      ),
    );
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as const,
    allowedMentions: { parse: [] as never[] },
  };
}
