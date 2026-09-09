export const staffMessages = {
  points: {
    reportClaimReason: (caseId: string) => `استلام البلاغ ${caseId}`,
    ticketClaimReason: (ticketId: string) => `استلام التكت ${ticketId}`,
  },
} as const;
