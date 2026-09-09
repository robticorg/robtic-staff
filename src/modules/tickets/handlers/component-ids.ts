export const TK_NS = "tk";

export const TicketCustomId = {
  panelSelect: () => `${TK_NS}:panelSelect`,

  questionModal: (panelId: string, page: number) => `${TK_NS}:qModal:${panelId}:${page}`,

  questionContinue: (panelId: string, page: number) => `${TK_NS}:qMore:${panelId}:${page}`,

  claim: (ticketId: string) => `${TK_NS}:claim:${ticketId}`,

  options: (ticketId: string) => `${TK_NS}:options:${ticketId}`,

  optClose: (ticketId: string) => `${TK_NS}:optClose:${ticketId}`,
  optAddUser: (ticketId: string) => `${TK_NS}:optAddUser:${ticketId}`,
  optRemoveUser: (ticketId: string) => `${TK_NS}:optRemoveUser:${ticketId}`,

  addUserModal: (ticketId: string) => `${TK_NS}:addUserModal:${ticketId}`,
  removeUserModal: (ticketId: string) => `${TK_NS}:removeUserModal:${ticketId}`,

  faqSelect: (ticketId: string) => `${TK_NS}:faqSelect:${ticketId}`,
} as const;

export const TicketModalField = {
  answer: (questionId: string) => `q:${questionId}`,
  addUsers: "addUsers",
  addRoles: "addRoles",
  removeTargets: "removeTargets",
} as const;

export interface ParsedTicketId {
  action: string;
  args: string[];
}

export function parseTicketCustomId(raw: string): ParsedTicketId | null {
  if (!raw.startsWith(`${TK_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  if (!action) return null;
  return { action, args };
}

export function isTicketCustomId(raw: string): boolean {
  return raw.startsWith(`${TK_NS}:`);
}
