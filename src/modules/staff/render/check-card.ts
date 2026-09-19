import {
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import type { CheckEntry } from "../services/staff-promotion-points.service.ts";

const M = staffMessages.promotionPoints;

/**
 * A V2 message caps out at 40 components. Each staff member costs a separator plus
 * a text display, so 15 per message leaves plenty of headroom.
 */
const ENTRIES_PER_MESSAGE = 15;

/**
 * One block per staff member, split across as many messages as the roster needs.
 * Display name, mention, weekly total, decision — the staff `_id` never appears.
 *
 * No `allowedMentions` is set, so the prefix runner's `{ parse: [] }` default
 * applies and the mentions render as clickable pills without pinging anyone.
 */
export function buildCheckCards(
  requiredPoints: number,
  entries: readonly CheckEntry[],
): BaseMessageOptions[] {
  const pages: CheckEntry[][] = [];
  for (let i = 0; i < entries.length; i += ENTRIES_PER_MESSAGE) {
    pages.push(entries.slice(i, i + ENTRIES_PER_MESSAGE));
  }

  return pages.map((page, index) => {
    const container = new ContainerBuilder().setAccentColor(colors.primary);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        pages.length > 1
          ? M.headerPage(requiredPoints, index + 1, pages.length)
          : M.header(requiredPoints),
      ),
    );

    for (const entry of page) {
      container.addSeparatorComponents((s) =>
        s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          M.entry(entry.displayName, entry.userId, entry.weeklyPoints, entry.decision),
        ),
      );
    }

    return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
  });
}
