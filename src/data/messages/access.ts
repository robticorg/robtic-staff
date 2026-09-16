import { emojis } from "../emojis/index.ts";

const E = emojis;

export const accessMessages = {
  title: "تم تحديث رتب الوصول.",

  added: (count: number) => `تمت إضافة **${count}** رتبة:`,
  nothingAdded: `${E.warning} ما تمت إضافة ولا رتبة جديدة.`,
  skipped: (count: number) => `${E.warning} تم تجاوز **${count}** رتبة:`,
  total: (count: number) => `مجموع رتب الوصول الحالية: **${count}**`,
  andMore: (count: number) => `و **${count}** غيرها`,
  note: "رتب الوصول ما لها مستوى ستاف، وما تدخل في حساب السلّم أبداً.",

  rejected: {
    everyone: `— \`@everyone\` ما ينفع تكون رتبة وصول.`,
    managed: (roleId: string) => `— <@&${roleId}> رتبة بوت/تكامل وما ينفع تنضاف.`,
    unmanageable: (roleId: string) => `— <@&${roleId}> فوق رتبتي وما أقدر أديرها.`,
    already: (roleId: string) => `— <@&${roleId}> مضافة أصلاً.`,
    reserved: (roleId: string, slot: string) =>
      `— <@&${roleId}> مستخدمة أصلاً كـ **${slot}**، لازم تشيلها من هناك أول.`,
    missing: (roleId: string) => `— <@&${roleId}> ما عادت موجودة في السيرفر.`,
  },

  errors: {
    noOptions: `${E.error} لازم تحدد على الأقل خيار واحد: \`role\` أو \`from\` + \`to\`.`,
    fromWithoutTo: `${E.error} حددت \`from\` بدون \`to\` — لازم الاثنين مع بعض عشان النطاق.`,
    toWithoutFrom: `${E.error} حددت \`to\` بدون \`from\` — لازم الاثنين مع بعض عشان النطاق.`,
    emptyRange: `${E.error} ما فيه ولا رتبة بين الرتبتين اللي حددتها.`,
    rangeRoleMissing: `${E.error} وحدة من رتب النطاق ما عادت موجودة في السيرفر.`,
  },
} as const;
