import { emojis } from "../emojis/index.ts";

const E = emojis;

export const acceptedRoleMessages = {
  title: "تم ضبط رتبة قبول الستاف.",

  role: (roleId: string) => `الرتبة: <@&${roleId}>`,
  allLevels: "النطاق: **كل المستويات** — أي عضو ينقبل في الستاف ياخذ الرتبة.",
  range: (fromLevel: number, toLevel: number) =>
    `النطاق: من المستوى **${fromLevel}** إلى المستوى **${toLevel}** (شامل الطرفين).`,
  note: "هذي الرتبة ما لها مستوى ستاف، وما تدخل في حساب السلّم ولا في صلاحيات الإدارة.",
  existingNote:
    "الإعداد يطبّق على القبولات الجاية وعلى أي ترقية/تنزيل بعد الحين — ما راح يتعدّل الستاف الحاليين تلقائياً.",

  problems: {
    ROLE_REQUIRED: `${E.error} لازم تحدد الرتبة في خيار \`role\`.`,
    FROM_WITHOUT_TO: `${E.error} حددت \`from\` بدون \`to\` — لازم الاثنين مع بعض.`,
    TO_WITHOUT_FROM: `${E.error} حددت \`to\` بدون \`from\` — لازم الاثنين مع بعض.`,
    EVERYONE: `${E.error} \`@everyone\` ما ينفع تكون رتبة قبول.`,
    MANAGED: `${E.error} هذي رتبة بوت/تكامل وما ينفع تنضبط.`,
    UNMANAGEABLE: `${E.error} هذي الرتبة فوق رتبتي وما أقدر أديرها — حرّك رتبتي فوقها.`,
    RESERVED: (slot: string) =>
      `${E.error} هذي الرتبة مستخدمة أصلاً كـ **${slot}**. رتبة القبول لازم تكون رتبة مستقلة.`,
    FROM_NOT_NUMBERED: `${E.error} رتبة \`from\` لازم تكون من رتب الستاف المرقّمة.`,
    TO_NOT_NUMBERED: `${E.error} رتبة \`to\` لازم تكون من رتب الستاف المرقّمة.`,
    RANGE_INVERTED: `${E.error} مستوى \`from\` لازم يكون أقل أو يساوي مستوى \`to\`.`,
  },
} as const;
