export const staffTypeMessages = {
  title: "تم ضبط رتبة نوع الستاف.",

  configured: (typeLabel: string, roleId: string) =>
    `النوع **${typeLabel}** صار مربوط بالرتبة <@&${roleId}>.`,
  usage: (slug: string) => `تنعطى بـ \`!accept @user ${slug}\`.`,
  note:
    "رتبة النوع مستقلة تماماً عن سلّم الستاف — ما لها مستوى، وما تتغيّر مع الترقية ولا التنزيل.",

  problems: {
    UNKNOWN_TYPE: "نوع ستاف غير معروف.",
    MISSING: "لازم تحدد رتبة.",
    EVERYONE: "ما ينفع تستخدم @everyone.",
    MANAGED: "هذي رتبة بوت أو تكامل، وما ينفع تتعطى يدوياً.",
    UNMANAGEABLE: "رتبتي أقل من هذي الرتبة، فما أقدر أتحكم فيها. ارفع رتبة البوت فوقها.",
    RESERVED: (conflict: string) =>
      `هذي الرتبة محجوزة أصلاً كـ **${conflict}**. اختر رتبة ثانية — رتبة النوع ما ينفع تكون جزء من السلّم.`,
  },
} as const;
