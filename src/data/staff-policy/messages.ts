import { bilingual } from "../../shared/utils/lang-context.ts";

/** Shown when someone uses a system the server turned off from the dashboard. */
export const staffPolicyMessages = bilingual(
  { featureOff: "This system is turned off in this server." },
  { featureOff: "هذا النظام متوقف في هذا السيرفر." },
);
