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

function compose(level: number, targetId: UserId, reason: string, proof: string): string {
  return [
    M.heading(level),
    M.mention(targetId),
    M.reason(reason),
    M.proof(proof),
  ].join("\n");
}

/**
 * Builds the exact four-line Staff Warn message.
 *
 * The reason is passed through verbatim — it is the manager's own words and
 * must not be rewritten or translated. Proof URLs are joined onto the single
 * proof line; if the result would exceed Discord's limit the trailing URLs are
 * dropped and marked, which is preferable to the send failing outright.
 */
export function formatStaffWarningMessage(input: StaffWarnMessageInput): string {
  const urls = input.evidence.filter((url) => url.trim().length > 0);

  if (urls.length === 0) {
    return compose(input.level, input.targetId, input.reason, M.noProof);
  }

  let kept = urls.length;
  let message = compose(input.level, input.targetId, input.reason, urls.join(M.proofSeparator));

  while (message.length > DISCORD_MESSAGE_LIMIT && kept > 1) {
    kept -= 1;
    const proof = urls.slice(0, kept).join(M.proofSeparator) + M.proofSeparator + M.truncated;
    message = compose(input.level, input.targetId, input.reason, proof);
  }

  return message;
}

/** True when the proof list had to be shortened — worth logging upstream. */
export function staffWarnMessageWasTruncated(message: string): boolean {
  return message.length > DISCORD_MESSAGE_LIMIT || message.includes(M.truncated);
}
