import { bilingual } from "../../shared/utils/lang-context.ts";

export const assignMessages = bilingual(
  {
    title: "Role tied to staff levels.",
    role: (roleId: string) => `Role: <@&${roleId}>`,
    allLevels: "Range: **all levels**; every staff member gets it.",
    range: (fromLevel: number, toLevel: number) => `Range: level **${fromLevel}** to **${toLevel}** (inclusive).`,
    total: (count: number) => `Linked roles now: **${count}**`,
    note: "Given and removed automatically on accept, promotion and demotion; it has no staff level and isn't on the ladder.",
  },
  {
    title: "تم ربط الرتبة بمستويات الطاقم.",
    role: (roleId: string) => `الرتبة: <@&${roleId}>`,
    allLevels: "النطاق: **كل المستويات**؛ كل إداري ياخذها.",
    range: (fromLevel: number, toLevel: number) => `النطاق: من المستوى **${fromLevel}** إلى **${toLevel}** (شامل).`,
    total: (count: number) => `الرتب المربوطة حالياً: **${count}**`,
    note: "تنعطى وتنشال تلقائياً مع القبول والترقية والتنزيل، بدون مستوى إداري وما تدخل في السلّم.",
  },
);
