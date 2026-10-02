import { emojis } from "../emojis/index.ts";

const E = emojis;

export const accessMessages = {
  restrictedOnly: `${E.error} هذا الأمر لمالك البوت والقائمة البيضاء بس.`,

  whitelist: {
    description: "إدارة القائمة البيضاء للأوامر الخاصة — لمالك البوت بس",
    add: "إضافة عضو للقائمة البيضاء",
    remove: "شيل عضو من القائمة البيضاء",
    list: "عرض القائمة البيضاء",
    userOption: "العضو",
    ownerOnly: `${E.error} القائمة البيضاء يتحكم فيها مالك البوت بس.`,
    bot: `${E.error} ما ينفع تضيف بوت.`,
    owner: `${E.warning} مالك البوت عنده صلاحية كاملة أصلاً.`,
    added: (userId: string) => `${E.success} تمت إضافة <@${userId}> للقائمة البيضاء.`,
    alreadyAdded: (userId: string) => `${E.warning} <@${userId}> موجود في القائمة البيضاء أصلاً.`,
    removed: (userId: string) => `${E.success} تم شيل <@${userId}> من القائمة البيضاء.`,
    notListed: (userId: string) => `${E.warning} <@${userId}> مو موجود في القائمة البيضاء.`,
    listTitle: "## القائمة البيضاء",
    listRow: (userId: string, addedBy: string, at: Date) =>
      `• <@${userId}> — أضافه <@${addedBy}> <t:${Math.floor(at.getTime() / 1000)}:R>`,
    empty: "القائمة البيضاء فاضية.",
  },
} as const;
