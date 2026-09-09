export const ReportType = {
  USER_REPORT: "USER_REPORT",
  STAFF_REPORT: "STAFF_REPORT",
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];
export const REPORT_TYPE_VALUES = Object.values(ReportType);

export const ReportStatus = {
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  INVESTIGATING: "INVESTIGATING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CLOSED: "CLOSED",
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
export const REPORT_STATUS_VALUES = Object.values(ReportStatus);

export const TERMINAL_REPORT_STATUSES: readonly ReportStatus[] = [
  ReportStatus.ACCEPTED,
  ReportStatus.REJECTED,
  ReportStatus.CLOSED,
];
