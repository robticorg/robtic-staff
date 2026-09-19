import { staffWarnChannelMessage } from "../../../data/messages/warnings.ts";
import type { UserId } from "../../../shared/types/index.ts";
import { composeWithProofLimit } from "./staff-warn-message.ts";

const M = staffWarnChannelMessage;
const L = staffWarnChannelMessage.moderation;

export const ModerationLogKind = {
  TIMEOUT: "TIMEOUT",
  JAIL: "JAIL",
  USER_WARN: "USER_WARN",
} as const;
export type ModerationLogKind = (typeof ModerationLogKind)[keyof typeof ModerationLogKind];

const HEADING: Record<ModerationLogKind, string> = {
  [ModerationLogKind.TIMEOUT]: L.timeoutHeading,
  [ModerationLogKind.JAIL]: L.jailHeading,
  [ModerationLogKind.USER_WARN]: L.userWarnHeading,
};

export interface ModerationLogInput {
  kind: ModerationLogKind;
  targetId: UserId;
  reason: string;
  evidence: readonly string[];
  moderatorId: UserId;

  /** Already formatted for display — timeout only. */
  duration?: string;
}

/**
 * The timeout / jail / user-warning entry for the staff-warning channel. Same
 * plain-text shape as a staff warning, plus the duration and the moderator.
 * Carries no punishment id, warning id or staff id.
 */
export function formatModerationLogMessage(input: ModerationLogInput): string {
  const leading = [HEADING[input.kind], M.mention(input.targetId), M.reason(input.reason)];
  if (input.duration) leading.push(L.duration(input.duration));

  return composeWithProofLimit(leading, input.evidence, [L.moderator(input.moderatorId)]);
}
