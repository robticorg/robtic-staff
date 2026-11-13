import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const acceptedRoleMessages = bilingual(
  {
    title: "Staff accepted role set.",
    role: (roleId: string) => `Role: <@&${roleId}>`,
    allLevels: "Range: **all levels**; everyone accepted to staff gets it.",
    range: (fromLevel: number, toLevel: number) => `Range: level **${fromLevel}** to **${toLevel}** (inclusive).`,
    note: "This role has no staff level and doesn't count for the ladder or permissions.",
    existingNote: "Applies to new accepts and future promotions/demotions; current staff aren't changed automatically.",
    problems: {
      ROLE_REQUIRED: `${E.error} Give the \`role\` option.`,
      FROM_WITHOUT_TO: `${E.error} Give \`from\` and \`to\` together.`,
      TO_WITHOUT_FROM: `${E.error} Give \`from\` and \`to\` together.`,
      EVERYONE: `${E.error} \`@everyone\` can't be the accepted role.`,
      MANAGED: `${E.error} That role belongs to a bot or integration.`,
      UNMANAGEABLE: `${E.error} That role is above mine. Move my role above it.`,
      RESERVED: (slot: string) => `${E.error} That role is already used as **${slot}**. Use a separate role.`,
      FROM_NOT_NUMBERED: `${E.error} The \`from\` role must be on the staff ladder.`,
      TO_NOT_NUMBERED: `${E.error} The \`to\` role must be on the staff ladder.`,
      RANGE_INVERTED: `${E.error} \`from\` must be at or below \`to\`.`,
    },
  },
  {
    title: "تم ضبط رتبة قبول الطاقم.",
    role: (roleId: string) => `الرتبة: <@&${roleId}>`,
    allLevels: "النطاق: **كل المستويات**؛ كل من ينقبل في الطاقم ياخذها.",
    range: (fromLevel: number, toLevel: number) => `النطاق: من المستوى **${fromLevel}** إلى **${toLevel}** (شامل).`,
    note: "هذي الرتبة بدون مستوى إداري، وما تدخل في السلّم ولا الصلاحيات.",
    existingNote: "تنطبق على القبولات والترقيات/التنزيلات الجاية؛ الطاقم الحاليين ما يتعدّلون تلقائياً.",
    problems: {
      ROLE_REQUIRED: `${E.error} حدد خيار \`role\`.`,
      FROM_WITHOUT_TO: `${E.error} \`from\` و \`to\` مع بعض.`,
      TO_WITHOUT_FROM: `${E.error} \`from\` و \`to\` مع بعض.`,
      EVERYONE: `${E.error} \`@everyone\` ما تنفع رتبة قبول.`,
      MANAGED: `${E.error} الرتبة تابعة لبوت أو تكامل.`,
      UNMANAGEABLE: `${E.error} الرتبة فوق رتبتي. حط رتبتي فوقها.`,
      RESERVED: (slot: string) => `${E.error} الرتبة مستخدمة كـ **${slot}**. استخدم رتبة مستقلة.`,
      FROM_NOT_NUMBERED: `${E.error} رتبة \`from\` لازم تكون ضمن سلّم الطاقم.`,
      TO_NOT_NUMBERED: `${E.error} رتبة \`to\` لازم تكون ضمن سلّم الطاقم.`,
      RANGE_INVERTED: `${E.error} \`from\` لازم أقل من أو يساوي \`to\`.`,
    },
  },
);
