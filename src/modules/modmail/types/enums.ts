export const ModmailCaseType = {
  USER_REPORT: "USER_REPORT",
  STAFF_REPORT: "STAFF_REPORT",
} as const;
export type ModmailCaseType = (typeof ModmailCaseType)[keyof typeof ModmailCaseType];
export const MODMAIL_CASE_TYPE_VALUES = Object.values(ModmailCaseType);

export const ModmailCaseStatus = {
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  INVESTIGATING: "INVESTIGATING",
  WAITING_USER: "WAITING_USER",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type ModmailCaseStatus = (typeof ModmailCaseStatus)[keyof typeof ModmailCaseStatus];
export const MODMAIL_CASE_STATUS_VALUES = Object.values(ModmailCaseStatus);

export const OPEN_CASE_STATUSES: readonly ModmailCaseStatus[] = [
  ModmailCaseStatus.PENDING,
  ModmailCaseStatus.CLAIMED,
  ModmailCaseStatus.INVESTIGATING,
  ModmailCaseStatus.WAITING_USER,
  ModmailCaseStatus.RESOLVED,
];

export const ModmailSenderType = {
  USER: "USER",
  STAFF: "STAFF",
  BOT: "BOT",
} as const;
export type ModmailSenderType = (typeof ModmailSenderType)[keyof typeof ModmailSenderType];
export const MODMAIL_SENDER_TYPE_VALUES = Object.values(ModmailSenderType);

export const AttachmentStorageKind = {
  DISCORD_CDN: "DISCORD_CDN",
  EXTERNAL: "EXTERNAL",
} as const;
export type AttachmentStorageKind =
  (typeof AttachmentStorageKind)[keyof typeof AttachmentStorageKind];
export const ATTACHMENT_STORAGE_KIND_VALUES = Object.values(AttachmentStorageKind);

export const ModmailAuditAction = {
  CASE_CREATED: "CASE_CREATED",
  CASE_CLAIMED: "CASE_CLAIMED",
  MESSAGE_FROM_USER: "MESSAGE_FROM_USER",
  MESSAGE_FROM_STAFF: "MESSAGE_FROM_STAFF",
  EVIDENCE_ADDED: "EVIDENCE_ADDED",
  STATE_CHANGED: "STATE_CHANGED",
  CASE_RESOLVED: "CASE_RESOLVED",
  CASE_CLOSED: "CASE_CLOSED",
  REPORTER_INFO_VIEWED: "REPORTER_INFO_VIEWED",
} as const;
export type ModmailAuditAction =
  (typeof ModmailAuditAction)[keyof typeof ModmailAuditAction];
export const MODMAIL_AUDIT_ACTION_VALUES = Object.values(ModmailAuditAction);

export const ModmailActorType = {
  USER: "USER",
  STAFF: "STAFF",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
export type ModmailActorType = (typeof ModmailActorType)[keyof typeof ModmailActorType];
export const MODMAIL_ACTOR_TYPE_VALUES = Object.values(ModmailActorType);
