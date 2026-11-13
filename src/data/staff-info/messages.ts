import { emojis } from "../emojis/index.ts";
import { staffInfoLimits as L } from "./config.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const staffInfoMessages = bilingual(
  {
    panel: {
      empty: "-# Nothing added yet.",
    },

    viewer: {
      pageFooter: (page: number, pages: number) => `-# Page ${page} of ${pages}`,
      previous: "Previous",
      next: "Next",
      gone: `${E.error} This entry was deleted or changed. Pick again from the menu.`,
      noAccess: (roleId: string) => `${E.error} This entry is for <@&${roleId}> only.`,
    },

    modal: {
      addTitle: "Add entry",
      pageTitle: "Add page",
      editTitle: (page: number) => `Edit page ${page}`,
      nameLabel: "Name (shown in the menu)",
      namePlaceholder: "e.g. Staff rules",
      descriptionLabel: "Description (under the name)",
      descriptionPlaceholder: "e.g. Every rule you need to know",
      contentLabel: "Content",
      contentPlaceholder: "What members see when they pick it",
    },

    command: {
      description: "Manage the staff info panel",
      setup: "Post the info panel here (or update it)",
      add: "Add an entry to the menu",
      remove: "Remove an entry from the menu",
      see: "List the entries, or preview one",
      pageGroup: "An entry's pages",
      pageAdd: "Add a page to an entry",
      pageDelete: "Delete a page from an entry",
      access: "Limit an entry to one role (no role = everyone)",
      roleOption: "The allowed role; leave empty for everyone",
      accessSet: (name: string, roleId: string) => `${E.success} **${name}** is now for <@&${roleId}> only (and admins).`,
      accessCleared: (name: string) => `${E.success} **${name}** is now for everyone.`,
      accessEveryone: "@everyone doesn't work; leave the role empty for everyone.",
      pageEdit: "Edit a page of an entry",
      infoOption: "The entry",
      pageOption: "Page number",
      pageChoice: (page: number, preview: string) => `Page ${page} — ${preview}`,
      pickInfoFirst: "Pick the entry first",
      setupDone: (channelId: string) => `${E.success} Info panel posted in <#${channelId}>.`,
      setupUpdated: (channelId: string) => `${E.success} Info panel updated in <#${channelId}>.`,
      setupChannelInvalid: `${E.error} Use this in a text channel.`,
      added: (name: string, panelUpdated: boolean) =>
        `${E.success} **${name}** added.` + (panelUpdated ? " Panel updated." : "\n-# The panel isn't posted yet; use `/info setup`."),
      removed: (name: string) => `${E.success} **${name}** removed; panel updated.`,
      pageAdded: (name: string, page: number) => `${E.success} Page **${page}** added to **${name}**.`,
      pageDeleted: (name: string, page: number, left: number) => `${E.success} Page **${page}** of **${name}** deleted; ${left} left.`,
      pageEdited: (name: string, page: number) => `${E.success} Page **${page}** of **${name}** edited.`,
      pageNotFound: (pages: number) => `${E.error} The page must be 1 to ${pages}.`,
      lastPage: `${E.error} That's the last page. To delete the whole entry use \`/info remove\`.`,
      pageChanged: `${E.error} The entry changed at the same moment. Try again.`,
      notFound: `${E.error} Couldn't find that entry. Pick from the list.`,
      nameTaken: (name: string) => `${E.error} **${name}** already exists.`,
      tooMany: `${E.error} The menu is full (${L.maxInfos} entries).`,
      tooManyPages: `${E.error} This entry is full (${L.maxPages} pages).`,
      fieldsRequired: `${E.error} Name, description and content are all required.`,
      contentRequired: `${E.error} Write the page's content.`,
      listTitle: "**Entries**",
      listEmpty: "Nothing added yet. Use `/info add`.",
      listRow: (index: number, name: string, description: string, pages: number, accessRoleId: string | null) =>
        `**${index}. ${name}** — ${description} · ${pages} page${pages === 1 ? "" : "s"}` + (accessRoleId ? ` · 🔒 <@&${accessRoleId}>` : ""),
    },
  },
  {
    panel: {
      empty: "-# ما فيه معلومات مضافة.",
    },

    viewer: {
      pageFooter: (page: number, pages: number) => `-# صفحة ${page} من ${pages}`,
      previous: "السابق",
      next: "التالي",
      gone: `${E.error} المعلومة انحذفت أو تغيّرت. اختر من القائمة من جديد.`,
      noAccess: (roleId: string) => `${E.error} المعلومة لأصحاب رتبة <@&${roleId}> بس.`,
    },

    modal: {
      addTitle: "إضافة معلومة",
      pageTitle: "إضافة صفحة",
      editTitle: (page: number) => `تعديل الصفحة ${page}`,
      nameLabel: "الاسم (يظهر في القائمة)",
      namePlaceholder: "مثال: قوانين الإدارة",
      descriptionLabel: "الوصف (تحت الاسم)",
      descriptionPlaceholder: "مثال: كل القوانين اللي تحتاجها",
      contentLabel: "المحتوى",
      contentPlaceholder: "اللي يشوفه العضو إذا اختارها",
    },

    command: {
      description: "إدارة لوحة معلومات الإدارة",
      setup: "نشر لوحة المعلومات هنا (أو تحديثها)",
      add: "إضافة معلومة للقائمة",
      remove: "حذف معلومة من القائمة",
      see: "عرض المعلومات أو معاينة وحدة",
      pageGroup: "صفحات المعلومة",
      pageAdd: "إضافة صفحة لمعلومة",
      pageDelete: "حذف صفحة من معلومة",
      access: "تحديد رتبة وحدة تشوف المعلومة (بدون رتبة = للكل)",
      roleOption: "الرتبة المسموحة؛ فاضي = للكل",
      accessSet: (name: string, roleId: string) => `${E.success} صارت **${name}** لأصحاب رتبة <@&${roleId}> بس (والأدمن).`,
      accessCleared: (name: string) => `${E.success} صارت **${name}** للكل.`,
      accessEveryone: "@everyone ما تنفع؛ خلّ الرتبة فاضية عشان تصير للكل.",
      pageEdit: "تعديل صفحة في معلومة",
      infoOption: "المعلومة",
      pageOption: "رقم الصفحة",
      pageChoice: (page: number, preview: string) => `صفحة ${page} — ${preview}`,
      pickInfoFirst: "اختر المعلومة أول",
      setupDone: (channelId: string) => `${E.success} تم نشر لوحة المعلومات في <#${channelId}>.`,
      setupUpdated: (channelId: string) => `${E.success} تم تحديث لوحة المعلومات في <#${channelId}>.`,
      setupChannelInvalid: `${E.error} استخدمه في روم نصي.`,
      added: (name: string, panelUpdated: boolean) =>
        `${E.success} تمت إضافة **${name}**.` + (panelUpdated ? " وتحدّثت اللوحة." : "\n-# اللوحة مو منشورة؛ استخدم `/info setup`."),
      removed: (name: string) => `${E.success} تم حذف **${name}** وتحديث اللوحة.`,
      pageAdded: (name: string, page: number) => `${E.success} تمت إضافة الصفحة **${page}** لـ **${name}**.`,
      pageDeleted: (name: string, page: number, left: number) => `${E.success} تم حذف الصفحة **${page}** من **${name}**، باقي ${left}.`,
      pageEdited: (name: string, page: number) => `${E.success} تم تعديل الصفحة **${page}** في **${name}**.`,
      pageNotFound: (pages: number) => `${E.error} الصفحة من 1 إلى ${pages}.`,
      lastPage: `${E.error} هذي آخر صفحة. لحذف المعلومة كاملة استخدم \`/info remove\`.`,
      pageChanged: `${E.error} المعلومة تغيّرت بنفس اللحظة. جرّب مرة ثانية.`,
      notFound: `${E.error} ما لقيت المعلومة. اختر من القائمة.`,
      nameTaken: (name: string) => `${E.error} **${name}** موجودة أصلاً.`,
      tooMany: `${E.error} القائمة ممتلئة (${L.maxInfos} معلومة).`,
      tooManyPages: `${E.error} المعلومة ممتلئة (${L.maxPages} صفحة).`,
      fieldsRequired: `${E.error} الاسم والوصف والمحتوى مطلوبة.`,
      contentRequired: `${E.error} اكتب محتوى الصفحة.`,
      listTitle: "**المعلومات المضافة**",
      listEmpty: "ما فيه معلومات؛ استخدم `/info add`.",
      listRow: (index: number, name: string, description: string, pages: number, accessRoleId: string | null) =>
        `**${index}. ${name}** — ${description} · ${pages} ${pages === 1 ? "صفحة" : "صفحات"}` + (accessRoleId ? ` · 🔒 <@&${accessRoleId}>` : ""),
    },
  },
);
