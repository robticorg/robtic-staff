import { ValidationError } from "../../../shared/utils/errors.ts";
import { ModmailCaseStatus } from "./enums.ts";

export const CASE_TRANSITIONS: Record<ModmailCaseStatus, readonly ModmailCaseStatus[]> = {
  [ModmailCaseStatus.PENDING]: [ModmailCaseStatus.CLAIMED, ModmailCaseStatus.CLOSED],
  [ModmailCaseStatus.CLAIMED]: [
    ModmailCaseStatus.INVESTIGATING,
    ModmailCaseStatus.WAITING_USER,
    ModmailCaseStatus.CLOSED,
  ],
  [ModmailCaseStatus.INVESTIGATING]: [
    ModmailCaseStatus.WAITING_USER,
    ModmailCaseStatus.RESOLVED,
    ModmailCaseStatus.CLOSED,
  ],
  [ModmailCaseStatus.WAITING_USER]: [
    ModmailCaseStatus.INVESTIGATING,
    ModmailCaseStatus.RESOLVED,
    ModmailCaseStatus.CLOSED,
  ],
  [ModmailCaseStatus.RESOLVED]: [ModmailCaseStatus.INVESTIGATING, ModmailCaseStatus.CLOSED],
  [ModmailCaseStatus.CLOSED]: [],
};

export function canTransition(from: ModmailCaseStatus, to: ModmailCaseStatus): boolean {
  if (from === to) return true;
  return CASE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ModmailCaseStatus, to: ModmailCaseStatus): void {
  if (!canTransition(from, to)) {
    throw new ValidationError(`Illegal case transition: ${from} → ${to}`, { from, to });
  }
}
