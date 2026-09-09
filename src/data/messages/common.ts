import { emojis } from "../emojis/index.ts";

export const commonMessages = {
  prefix: {
    success: emojis.success,
    error: emojis.error,
  },

  errors: {
    commandCrashed: `${emojis.error} صار خطأ وأنا أنفذ الأمر. تم إبلاغ الفريق.`,

    componentCrashed: `${emojis.error} صار خطأ، جرب مرة ثانية.`,

    guildOnly: "هذا الأمر يشتغل داخل السيرفر بس.",

    guildOnlyAction: "هذا الإجراء يشتغل داخل السيرفر بس.",

    needAdministrator: "لازم يكون عندك صلاحية **Administrator** عشان تستخدم هذا الأمر.",

    membershipUnverified: "ما قدرت أتأكد إنك عضو في السيرفر.",

    commandNotCompleted: "ما تم تنفيذ الأمر",

    unknownSubcommand: (sub: string) => `أمر فرعي غير معروف: \`${sub}\``,
  },
} as const;
