import { branding } from "./branding.ts";
import { colors } from "./colors.ts";
import { limits } from "./limits.ts";
import { punishmentConfig } from "./punishment.ts";

export { branding, type Branding } from "./branding.ts";
export { colors, type ColorName, type Colors } from "./colors.ts";
export { limits, type Limits } from "./limits.ts";
export { punishmentConfig, EVIDENCE_WINDOW_MS } from "./punishment.ts";

export const appData = {
  branding,
  colors,
  limits,
  punishment: punishmentConfig,

  caseIdPrefix: "RPT-",

  timezoneFallback: "UTC",

  features: {
    ticketSystem: false,
    giftClaims: false,
    punishments: false,
    appeals: false,
  },
} as const;

export type AppData = typeof appData;
