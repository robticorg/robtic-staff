export const assignMessages = {
  title: "تم ربط الرتبة بمستويات الستاف.",

  role: (roleId: string) => `الرتبة: <@&${roleId}>`,
  allLevels: "النطاق: **كل المستويات** — أي عضو ستاف ياخذ الرتبة.",
  range: (fromLevel: number, toLevel: number) =>
    `النطاق: من المستوى **${fromLevel}** إلى المستوى **${toLevel}** (شامل الطرفين).`,
  total: (count: number) => `مجموع الرتب المربوطة حالياً: **${count}**`,
  note:
    "الرتبة تنعطى وتنشال تلقائياً مع القبول والترقية والتنزيل — وما لها مستوى ستاف ولا تدخل في السلّم.",
} as const;
