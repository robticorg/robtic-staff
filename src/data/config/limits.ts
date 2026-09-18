export const limits = {
  reasonMaxLength: 300,

  descriptionMaxLength: 3000,

  /** The report card carries the description now, and a V2 container caps out at 4000 chars. */
  reportCardDescriptionMaxLength: 1000,

  userIdMinLength: 17,
  userIdMaxLength: 20,

  caseChoiceButtons: 5,

  threadAutoArchiveMinutes: 4320,

  dmLinkFallbackLength: 1900,

  reportRuleWidth: 16,

  ticketQuestionsPerModal: 5,

  selectMenuMaxOptions: 25,

  resolvedSelectMaxValues: 25,

  faqAutocompleteResults: 25,

  transcriptMessageCap: 500,

  ticketCloseConfirmSeconds: 5,

  ticketSleepDefaultMs: 6 * 3_600_000,
  ticketSleepMinMs: 60_000,
  ticketSleepMaxMs: 7 * 86_400_000,

  ticketSleepSweepIntervalMs: 60_000,
  ticketSleepSweepBatch: 25,
} as const;

export type Limits = typeof limits;
