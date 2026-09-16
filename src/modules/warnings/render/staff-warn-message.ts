import { staffWarnChannelMessage } from "../../../data/messages/warnings.ts";
import type { UserId } from "../../../shared/types/index.ts";

const M = staffWarnChannelMessage;

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

export function formatStaffWarningMessage(input: StaffWarnMessageInput): string {
  return composeWithLimit(M.heading(input.level), input.targetId, input.reason, input.evidence);
}

export function formatVerbalStaffWarningMessage(input: VerbalStaffWarnMessageInput): string {
  return composeWithLimit(M.headingVerbal, input.targetId, input.reason, input.evidence);
}

export function staffWarnMessageWasTruncated(message: string): boolean {
  return message.length > DISCORD_MESSAGE_LIMIT || message.includes(M.truncated);
}
