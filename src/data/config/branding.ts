import { L } from "../../shared/utils/lang-context.ts";

export const branding = {
  botName: "Robtic",

  communityName: "RobTic",

  get moderationTitle() { return L("Robtic Staff", "إدارة Robtic"); },

  footers: {
    get default() { return L("Robtic Staff", "إدارة Robtic"); },
    get reports() { return L("Robtic • Reports", "Robtic • نظام البلاغات"); },
    get support() { return L("Robtic • Support", "Robtic • الدعم"); },
    get config() { return L("Robtic • Settings", "Robtic • الإعدادات"); },
  },
};

export type Branding = typeof branding;
