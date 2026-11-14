import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const rel = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;

export const accessMessages = bilingual(
  {
    restrictedOnly: `${E.error} For the bot owner and the whitelist only.`,
    whitelist: {
      description: "Manage the whitelist for private commands (bot owner only)",
      add: "Add a member to the whitelist",
      remove: "Remove a member from the whitelist",
      list: "Show the whitelist",
      userOption: "Member",
      ownerOnly: `${E.error} Only the bot owner manages the whitelist.`,
      bot: `${E.error} You can't add a bot.`,
      owner: `${E.warning} The bot owner already has full access.`,
      added: (userId: string) => `${E.success} <@${userId}> added to the whitelist.`,
      alreadyAdded: (userId: string) => `${E.warning} <@${userId}> is already on it.`,
      removed: (userId: string) => `${E.success} <@${userId}> removed from the whitelist.`,
      notListed: (userId: string) => `${E.warning} <@${userId}> isn't on it.`,
      listTitle: "## Whitelist",
      listRow: (userId: string, addedBy: string, at: Date) => `• <@${userId}> — added by <@${addedBy}> ${rel(at)}`,
      empty: "The whitelist is empty.",
    },
  },
  {
    restrictedOnly: `${E.error} هذا الأمر مخصص لمالك البوت والقائمة البيضاء فقط.`,
    whitelist: {
      description: "إدارة القائمة البيضاء للأوامر الخاصة (لمالك البوت فقط)",
      add: "إضافة عضو إلى القائمة البيضاء",
      remove: "إزالة عضو من القائمة البيضاء",
      list: "عرض القائمة البيضاء",
      userOption: "العضو",
      ownerOnly: `${E.error} إدارة القائمة البيضاء مخصصة لمالك البوت فقط.`,
      bot: `${E.error} لا يمكن إضافة بوت.`,
      owner: `${E.warning} مالك البوت يملك صلاحية كاملة بالفعل.`,
      added: (userId: string) => `${E.success} تمت إضافة <@${userId}> إلى القائمة البيضاء.`,
      alreadyAdded: (userId: string) => `${E.warning} <@${userId}> موجود في القائمة البيضاء بالفعل.`,
      removed: (userId: string) => `${E.success} تمت إزالة <@${userId}> من القائمة البيضاء.`,
      notListed: (userId: string) => `${E.warning} <@${userId}> غير موجود في القائمة البيضاء.`,
      listTitle: "## القائمة البيضاء",
      listRow: (userId: string, addedBy: string, at: Date) => `• <@${userId}> — أضافه <@${addedBy}> ${rel(at)}`,
      empty: "القائمة البيضاء فارغة.",
    },
  },
);
