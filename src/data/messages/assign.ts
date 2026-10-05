export const assignMessages = {
  title: "تم ربط الرتبة بمستويات الطاقم الاداري.",

  role: (roleId: string) => `الرتبة: <@&${roleId}>`,
  allLevels: "النطاق: **كل المستويات** — أي عضو في الطاقم الاداري ياخذ الرتبة.",
  range: (fromLevel: number, toLevel: number) =>
    `النطاق: من المستوى **${fromLevel}** إلى المستوى **${toLevel}** (شامل الطرفين).`,
  total: (count: number) => `مجموع الرتب المربوطة حالياً: **${count}**`,
  note:
    "الرتبة تنعطى وتنشال تلقائياً مع القبول والترقية والتنزيل — وما لها مستوى اداري ولا تدخل في السلّم.",
} as const;
