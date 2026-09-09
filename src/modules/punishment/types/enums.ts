import { ValidationError } from "../../../shared/utils/errors.ts";

export const PunishmentType = {
  WARN: "WARN",
  TIMEOUT: "TIMEOUT",
  MUTE: "MUTE",
  JAIL: "JAIL",
  KICK: "KICK",
  BAN: "BAN",
  NO_ACTION: "NO_ACTION",
} as const;
export type PunishmentType = (typeof PunishmentType)[keyof typeof PunishmentType];
export const PUNISHMENT_TYPE_VALUES = Object.values(PunishmentType);

export const PunishmentAction = PunishmentType;
export type PunishmentAction = PunishmentType;
export const PUNISHMENT_ACTION_VALUES = PUNISHMENT_TYPE_VALUES;

export const DIRECT_PUNISHMENT_TYPES: readonly PunishmentType[] = [
  PunishmentType.WARN,
  PunishmentType.TIMEOUT,
  PunishmentType.MUTE,
  PunishmentType.JAIL,
  PunishmentType.NO_ACTION,
];

export const APPROVAL_PUNISHMENT_TYPES: readonly PunishmentType[] = [
  PunishmentType.KICK,
  PunishmentType.BAN,
];

export function requiresApproval(type: PunishmentType): boolean {
  return (APPROVAL_PUNISHMENT_TYPES as PunishmentType[]).includes(type);
}

export function isDirectPunishment(type: PunishmentType): boolean {
  return (DIRECT_PUNISHMENT_TYPES as PunishmentType[]).includes(type);
}

export const PunishmentStatus = {
  PENDING: "PENDING",
  APPROVAL: "APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXECUTED: "EXECUTED",
  FAILED: "FAILED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;
export type PunishmentStatus = (typeof PunishmentStatus)[keyof typeof PunishmentStatus];
export const PUNISHMENT_STATUS_VALUES = Object.values(PunishmentStatus);

const PUNISHMENT_TRANSITIONS: Record<PunishmentStatus, readonly PunishmentStatus[]> = {
  [PunishmentStatus.PENDING]: [
    PunishmentStatus.APPROVAL,
    PunishmentStatus.EXECUTED,
    PunishmentStatus.FAILED,
    PunishmentStatus.REJECTED,
  ],
  [PunishmentStatus.APPROVAL]: [
    PunishmentStatus.APPROVED,
    PunishmentStatus.REJECTED,
    PunishmentStatus.EXPIRED,
  ],
  [PunishmentStatus.APPROVED]: [PunishmentStatus.EXECUTED, PunishmentStatus.FAILED],
  [PunishmentStatus.EXECUTED]: [PunishmentStatus.REVOKED, PunishmentStatus.EXPIRED],
  [PunishmentStatus.FAILED]: [PunishmentStatus.APPROVAL, PunishmentStatus.EXECUTED],
  [PunishmentStatus.REJECTED]: [],
  [PunishmentStatus.REVOKED]: [],
  [PunishmentStatus.EXPIRED]: [PunishmentStatus.REVOKED],
};

export function canPunishmentTransition(from: PunishmentStatus, to: PunishmentStatus): boolean {
  if (from === to) return true;
  return PUNISHMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertPunishmentTransition(from: PunishmentStatus, to: PunishmentStatus): void {
  if (!canPunishmentTransition(from, to)) {
    throw new ValidationError(`Illegal punishment transition: ${from} → ${to}`, { from, to });
  }
}

export const PunishmentApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type PunishmentApprovalStatus =
  (typeof PunishmentApprovalStatus)[keyof typeof PunishmentApprovalStatus];
export const PUNISHMENT_APPROVAL_STATUS_VALUES = Object.values(PunishmentApprovalStatus);

export const PunishmentAuditAction = {
  CREATED: "CREATED",
  APPROVAL_REQUESTED: "APPROVAL_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXECUTED: "EXECUTED",
  FAILED: "FAILED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
  DM_SENT: "DM_SENT",
  DM_FAILED: "DM_FAILED",
  APPEAL_SUBMITTED: "APPEAL_SUBMITTED",
  APPEAL_CLAIMED: "APPEAL_CLAIMED",
  APPEAL_ACCEPTED: "APPEAL_ACCEPTED",
  APPEAL_REJECTED: "APPEAL_REJECTED",
  REVERSAL_FAILED: "REVERSAL_FAILED",
} as const;
export type PunishmentAuditAction =
  (typeof PunishmentAuditAction)[keyof typeof PunishmentAuditAction];
export const PUNISHMENT_AUDIT_ACTION_VALUES = Object.values(PunishmentAuditAction);
