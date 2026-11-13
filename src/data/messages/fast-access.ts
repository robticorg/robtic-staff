import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const fastAccessMessages = bilingual(
  {
    managerOnly: `${E.error} Only staff managers can manage Fast Access macros.`,
    invalidCommand: `${E.error} The name must be 1 to 32 characters: a-z, 0-9, \`-\` or \`_\`.`,
    emptyMessage: `${E.error} The message can't be empty.`,
    invalidContext: `${E.error} The place must be MODMAIL, SUPPORT, STAFF_APPLICATION, STAFF_TRANSFER or PUBLIC.`,
    alreadyExists: (command: string) => `${E.error} \`$${command}\` already exists here.`,
    created: (command: string, context: string) => `${E.success} \`$${command}\` created for **${context}**.`,
    notFound: (command: string) => `${E.error} \`$${command}\` doesn't exist.`,
    removed: (command: string) => `${E.success} \`$${command}\` deleted.`,
    listTitle: "**Fast Access macros**",
    listEmpty: "No Fast Access macros yet.",
    listLine: (command: string, context: string, enabled: boolean) => `\`$${command}\` · ${context} · ${enabled ? "on" : "off"}`,
    contexts: {
      MODMAIL: "Modmail / reports",
      SUPPORT: "Support (tickets)",
      STAFF_APPLICATION: "Staff applications",
      STAFF_TRANSFER: "Staff transfers",
      PUBLIC: "Anywhere",
    },
  },
  {
    managerOnly: `${E.error} ماكروهات Fast Access لمانجرات الطاقم بس.`,
    invalidCommand: `${E.error} الاسم من 1 إلى 32 حرف: a-z و 0-9 و \`-\` أو \`_\`.`,
    emptyMessage: `${E.error} الرسالة ما تكون فاضية.`,
    invalidContext: `${E.error} المكان لازم يكون MODMAIL أو SUPPORT أو STAFF_APPLICATION أو STAFF_TRANSFER أو PUBLIC.`,
    alreadyExists: (command: string) => `${E.error} \`$${command}\` موجود أصلاً هنا.`,
    created: (command: string, context: string) => `${E.success} تم إنشاء \`$${command}\` لـ **${context}**.`,
    notFound: (command: string) => `${E.error} \`$${command}\` مو موجود.`,
    removed: (command: string) => `${E.success} تم حذف \`$${command}\`.`,
    listTitle: "**ماكروهات Fast Access**",
    listEmpty: "ما فيه ماكروهات Fast Access.",
    listLine: (command: string, context: string, enabled: boolean) => `\`$${command}\` · ${context} · ${enabled ? "مفعّل" : "متوقف"}`,
    contexts: {
      MODMAIL: "المودميل / البلاغات",
      SUPPORT: "الدعم (التكتات)",
      STAFF_APPLICATION: "التقديم على الطاقم",
      STAFF_TRANSFER: "نقل الطاقم",
      PUBLIC: "أي مكان",
    },
  },
);
