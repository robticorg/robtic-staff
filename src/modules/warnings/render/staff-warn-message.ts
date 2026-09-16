import { staffWarnChannelMessage } from "../../../data/messages/warnings.ts";
import type { UserId } from "../../../shared/types/index.ts";

const M = staffWarnChannelMessage;

/** Discord's hard limit for a message body. */
export const DISCORD_MESSAGE_LIMIT = 2000;

export interface StaffWarnMessageInput {
  level: number;
  targetId: UserId;
  reason: string;
  evidence: readonly string[];
}

export interface VerbalStaffWarnMessageInput {
  targetId: UserId;
  reason: string;
  evidence: readonly string[];
}

function compose(heading: string, targetId: UserId, reason: string, proof: string): string {
  return [heading, M.mention(targetId), M.reason(reason), M.proof(proof)].join("\n");
}

/**
 * Builds the exact four-line Staff Warn message for a given heading.
 *
 * The reason is passed through verbatim — it is the manager's own words and
 * must not be rewritten or translated. Proof URLs are joined onto the single
 * proof line; if the result would exceed Discord's limit the trailing URLs are
 * dropped and marked, which is preferable to the send failing outright.
 */
function composeWithLimit(
  heading: string,
  targetId: UserId,
  reason: string,
  evidence: readonly string[],
): string {
  const urls = evidence.filter((url) => url.trim().length > 0);

  if (urls.length === 0) {
    return compose(heading, targetId, reason, M.noProof);
  }

  let kept = urls.length;
  let message = compose(heading, targetId, reason, urls.join(M.proofSeparator));

  while (message.length > DISCORD_MESSAGE_LIMIT && kept > 1) {
    kept -= 1;
    const proof = urls.slice(0, kept).join(M.proofSeparator) + M.proofSeparator + M.truncated;
    message = compose(heading, targetId, reason, proof);
  }

  return message;
}

/** REAL staff warning (level 1/2/3) announcement. */
export function formatStaffWarningMessage(input: StaffWarnMessageInput): string {
  return composeWithLimit(M.heading(input.level), input.targetId, input.reason, input.evidence);
}

/** VERBAL staff warning announcement — same shape, "شفوي" heading instead of a level. */
export function formatVerbalStaffWarningMessage(input: VerbalStaffWarnMessageInput): string {
  return composeWithLimit(M.headingVerbal, input.targetId, input.reason, input.evidence);
}

/** True when the proof list had to be shortened — worth logging upstream. */
export function staffWarnMessageWasTruncated(message: string): boolean {
  return message.length > DISCORD_MESSAGE_LIMIT || message.includes(M.truncated);
}
