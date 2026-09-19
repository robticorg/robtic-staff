import { staffWarnChannelMessage } from "../../../data/messages/warnings.ts";
import type { UserId } from "../../../shared/types/index.ts";

const M = staffWarnChannelMessage;

export const DISCORD_MESSAGE_LIMIT = 2000;

export type StaffWarnCategory = "STAFF" | "OWNER";

export interface StaffWarnMessageInput {
  level: number;
  targetId: UserId;
  reason: string;
  evidence: readonly string[];
  category?: StaffWarnCategory;
}

export interface VerbalStaffWarnMessageInput {
  targetId: UserId;
  reason: string;
  evidence: readonly string[];
  category?: StaffWarnCategory;
}

/**
 * Builds `leading… / proof / trailing…` and drops proof URLs one at a time until
 * the whole thing fits Discord's 2000-character message cap. Shared by the staff
 * warning format and the timeout / jail / user-warning entries that sit in the
 * same channel, so the truncation rule is defined once.
 */
export function composeWithProofLimit(
  leadingLines: readonly string[],
  evidence: readonly string[],
  trailingLines: readonly string[] = [],
): string {
  const build = (proof: string) => [...leadingLines, M.proof(proof), ...trailingLines].join("\n");

  const urls = evidence.filter((url) => url.trim().length > 0);
  if (urls.length === 0) return build(M.noProof);

  let kept = urls.length;
  let message = build(urls.join(M.proofSeparator));

  while (message.length > DISCORD_MESSAGE_LIMIT && kept > 1) {
    kept -= 1;
    message = build(urls.slice(0, kept).join(M.proofSeparator) + M.proofSeparator + M.truncated);
  }

  return message;
}

function composeWithLimit(
  heading: string,
  targetId: UserId,
  reason: string,
  evidence: readonly string[],
): string {
  return composeWithProofLimit([heading, M.mention(targetId), M.reason(reason)], evidence);
}

export function formatStaffWarningMessage(input: StaffWarnMessageInput): string {
  return composeWithLimit(
    M.heading(input.level, input.category ?? "STAFF"),
    input.targetId,
    input.reason,
    input.evidence,
  );
}

export function formatVerbalStaffWarningMessage(input: VerbalStaffWarnMessageInput): string {
  return composeWithLimit(
    M.headingVerbalFor(input.category ?? "STAFF"),
    input.targetId,
    input.reason,
    input.evidence,
  );
}

export function staffWarnMessageWasTruncated(message: string): boolean {
  return message.length > DISCORD_MESSAGE_LIMIT || message.includes(M.truncated);
}
