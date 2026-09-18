import { ContainerBuilder, type BaseMessageOptions } from "discord.js";
import { colors, type ColorName } from "../../../data/config/colors.ts";
import { v2MessageOptions } from "./v2.ts";

export interface TicketNoticeOptions {
  /** Accent colour of the container. Defaults to `info`. */
  tone?: ColorName;
  /** User ids the notice is allowed to ping. Everything else stays silent. */
  mentions?: readonly string[];
}

/**
 * In-channel ticket notices ("claimed by X", "closing in 5s", "transferred to Y").
 * Every one of them is a Components V2 container so the ticket channel reads as
 * cards rather than a mix of cards and loose text.
 */
export function buildTicketNotice(
  lines: readonly (string | null | undefined)[],
  options: TicketNoticeOptions = {},
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors[options.tone ?? "info"]);

  for (const line of lines) {
    if (!line?.trim()) continue;
    container.addTextDisplayComponents((t) => t.setContent(line));
  }

  return {
    ...v2MessageOptions(container),
    allowedMentions: options.mentions?.length
      ? { users: [...options.mentions] }
      : { parse: [] as never[] },
  };
}
