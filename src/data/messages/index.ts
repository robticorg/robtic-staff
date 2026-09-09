import { commonMessages } from "./common.ts";
import { configMessages } from "./config.ts";
import { modmailMessages } from "./modmail.ts";
import { staffMessages } from "./staff.ts";
import { warningMessages } from "./warnings.ts";
import { ticketMessages } from "./tickets.ts";
import { prefixMessages } from "./prefix.ts";
import { fastAccessMessages } from "./fast-access.ts";
import { punishmentMessages } from "./punishment.ts";
import { statsMessages } from "./stats.ts";

export { commonMessages } from "./common.ts";
export { configMessages } from "./config.ts";
export { modmailMessages } from "./modmail.ts";
export { staffMessages } from "./staff.ts";
export { warningMessages } from "./warnings.ts";
export { ticketMessages } from "./tickets.ts";
export { prefixMessages } from "./prefix.ts";
export { fastAccessMessages } from "./fast-access.ts";
export { punishmentMessages } from "./punishment.ts";
export { statsMessages, ACTIVITY_LABELS } from "./stats.ts";

export const messages = {
  common: commonMessages,
  config: configMessages,
  modmail: modmailMessages,
  staff: staffMessages,
  warning: warningMessages,
  ticket: ticketMessages,
  prefix: prefixMessages,
  fastAccess: fastAccessMessages,
  punishment: punishmentMessages,
  stats: statsMessages,
} as const;

export type Messages = typeof messages;
