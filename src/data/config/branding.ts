export const branding = {
  botName: "Robtic",

  communityName: "RobTic",

  moderationTitle: "إدارة Robtic",

  footers: {
    default: "إدارة Robtic",
    reports: "Robtic • نظام البلاغات",
    support: "Robtic • الدعم",
    config: "Robtic • الإعدادات",
  },
} as const;

export type Branding = typeof branding;
