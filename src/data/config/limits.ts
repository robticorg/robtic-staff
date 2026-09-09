export const limits = {
  reasonMaxLength: 300,

  descriptionMaxLength: 3000,

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
} as const;

export type Limits = typeof limits;
