import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const accessMessages = bilingual(
  {
    title: "Access roles updated.",
    added: (count: number) => `Added **${count}** role(s):`,
    nothingAdded: `${E.warning} No new roles added.`,
    skipped: (count: number) => `${E.warning} Skipped **${count}** role(s):`,
    total: (count: number) => `Access roles now: **${count}**`,
    andMore: (count: number) => `and **${count}** more`,
    note: "Access roles have no staff level and never count on the ladder.",
    rejected: {
      everyone: "— `@everyone` can't be an access role.",
      managed: (roleId: string) => `— <@&${roleId}> belongs to a bot or integration.`,
      unmanageable: (roleId: string) => `— <@&${roleId}> is above my role.`,
      already: (roleId: string) => `— <@&${roleId}> is already added.`,
      reserved: (roleId: string, slot: string) => `— <@&${roleId}> is already used as **${slot}**; remove it there first.`,
      missing: (roleId: string) => `— <@&${roleId}> no longer exists.`,
    },
    errors: {
      noOptions: `${E.error} Give at least \`role\` or \`from\` + \`to\`.`,
      fromWithoutTo: `${E.error} Give \`from\` and \`to\` together for a range.`,
      toWithoutFrom: `${E.error} Give \`from\` and \`to\` together for a range.`,
      emptyRange: `${E.error} No roles between those two.`,
      rangeRoleMissing: `${E.error} One of the range roles no longer exists.`,
    },
  },
  {
    title: "تم تحديث رتب الوصول.",
    added: (count: number) => `تمت إضافة **${count}** رتبة:`,
    nothingAdded: `${E.warning} لم تتم إضافة أي رتب جديدة.`,
    skipped: (count: number) => `${E.warning} تم تجاوز **${count}** رتبة:`,
    total: (count: number) => `رتب الوصول الحالية: **${count}**`,
    andMore: (count: number) => `و**${count}** رتبة أخرى`,
    note: "رتب الوصول ليس لها مستوى إداري ولا تُحتسب ضمن السلّم.",
    rejected: {
      everyone: "— `@everyone` لا يمكن استخدامها كرتبة وصول.",
      managed: (roleId: string) => `— <@&${roleId}> تابعة لبوت أو تكامل.`,
      unmanageable: (roleId: string) => `— <@&${roleId}> أعلى من رتبة البوت.`,
      already: (roleId: string) => `— <@&${roleId}> مضافة بالفعل.`,
      reserved: (roleId: string, slot: string) => `— <@&${roleId}> مستخدمة كـ **${slot}**، يرجى إزالتها من هناك أولاً.`,
      missing: (roleId: string) => `— <@&${roleId}> لم تعد موجودة.`,
    },
    errors: {
      noOptions: `${E.error} يرجى تحديد \`role\` أو \`from\` + \`to\`.`,
      fromWithoutTo: `${E.error} يرجى تحديد \`from\` و\`to\` معاً للنطاق.`,
      toWithoutFrom: `${E.error} يرجى تحديد \`from\` و\`to\` معاً للنطاق.`,
      emptyRange: `${E.error} لا توجد رتب بين الرتبتين.`,
      rangeRoleMissing: `${E.error} إحدى رتب النطاق لم تعد موجودة.`,
    },
  },
);
