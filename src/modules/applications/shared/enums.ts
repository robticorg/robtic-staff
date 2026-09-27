export const ApplicationType = {
  NORMAL_APPLICATION: "NORMAL_APPLICATION",
  TRANSFER_APPLICATION: "TRANSFER_APPLICATION",
} as const;
export type ApplicationType = (typeof ApplicationType)[keyof typeof ApplicationType];
export const APPLICATION_TYPE_VALUES = Object.values(ApplicationType);

export const ApplicationStatus = {
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CLOSED: "CLOSED",
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
export const APPLICATION_STATUS_VALUES = Object.values(ApplicationStatus);

export const OPEN_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.PENDING,
  ApplicationStatus.CLAIMED,
  ApplicationStatus.UNDER_REVIEW,
];

export const ApplicationDepartment = {
  DEVELOPER: "DEVELOPER",
  DESIGNER: "DESIGNER",
  EDITOR: "EDITOR",
  STAFF: "STAFF",
} as const;
export type ApplicationDepartment =
  (typeof ApplicationDepartment)[keyof typeof ApplicationDepartment];
export const APPLICATION_DEPARTMENT_VALUES = Object.values(ApplicationDepartment);

export const ApplicantGender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
} as const;
export type ApplicantGender = (typeof ApplicantGender)[keyof typeof ApplicantGender];
export const APPLICANT_GENDER_VALUES = Object.values(ApplicantGender);

export const GirlVerificationStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
} as const;
export type GirlVerificationStatus =
  (typeof GirlVerificationStatus)[keyof typeof GirlVerificationStatus];
export const GIRL_VERIFICATION_STATUS_VALUES = Object.values(GirlVerificationStatus);
