import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const TicketPanelKind = {
  MAIN: "main",
  STAFF: "staff",
  RESPONSIBILITY: "responsibility",
} as const;
export type TicketPanelKind = (typeof TicketPanelKind)[keyof typeof TicketPanelKind];
export const TICKET_PANEL_KIND_VALUES: readonly string[] = Object.values(TicketPanelKind);

const role = (id: string | null, none: string) => (id ? `<@&${id}>` : none);

export const ticketSetupCommandMessages = bilingual(
  {
    description: "Set up tickets and post their panels",
    setup: "Set a ticket type's support role, manager and category",
    send: "Post a ticket panel in a channel",

    setupModal: {
      title: "Ticket setup",
      typeLabel: "Ticket type",
      typePlaceholder: "Choose a ticket type",
      supportLabel: "Support role",
      supportDescription: "Required for support tickets; optional for applications, transfers and staff support",
      managerLabel: "Ticket manager role (optional)",
      managerDescription: "Can see and manage the ticket, but not claim it",
      categoryLabel: "Ticket category",
      categoryDescription: "Where this ticket's channels open",
      logLabel: "Ticket log channel (optional)",
      logDescription: "Without it, logs go to the main ticket log channel",
    },

    sendModal: {
      title: "Post ticket panel",
      panelLabel: "Panel",
      panelPlaceholder: "Choose a panel",
      channelLabel: "Channel",
      channelDescription: "Where the panel is posted",
      titleLabel: "Title (responsibilities panel)",
      descriptionLabel: "Description (responsibilities panel)",
      imageLabel: "Image link (responsibilities panel)",
      optionalPlaceholder: "Optional; leave empty for the default",
    },

    kinds: {
      [TicketPanelKind.MAIN]: "Main ticket panel",
      [TicketPanelKind.STAFF]: "Staff support panel",
      [TicketPanelKind.RESPONSIBILITY]: "Responsibility application panel",
    } as Record<string, string>,

    setupDone: (panelName: string, supportRoleId: string | null, managerRoleId: string | null, categoryId: string | null, logChannelId: string | null) =>
      [
        `${E.success} **${panelName}** ticket set.`,
        `**Support role:** ${role(supportRoleId, "none (the configured one is used)")}`,
        `**Manager:** ${role(managerRoleId, "none")}`,
        `**Category:** ${categoryId ? `<#${categoryId}>` : "—"}`,
        `**Log channel:** ${logChannelId ? `<#${logChannelId}>` : "main ticket log"}`,
      ].join("\n"),
    sent: (kind: string, channelId: string, created: boolean) => `${E.success} ${kind} ${created ? "posted" : "updated"} in <#${channelId}>.`,
    hiddenNotSetUp: (names: string[]) => `${E.warning} Hidden until set up with \`/ticket setup\`: ${names.map((n) => `**${n}**`).join(", ")}`,

    errors: {
      adminOnly: `${E.error} Admins only.`,
      typeRequired: `${E.error} Choose a ticket type.`,
      notConfigurable: (panelName: string) => `${E.error} **${panelName}** doesn't open a ticket; set its channel on the dashboard (Channels) and its manager role under Ranks & roles.`,
      supportRequired: (panelName: string) => `${E.error} **${panelName}** needs a support role.`,
      categoryRequired: `${E.error} This ticket opens a channel and has no category set; choose one.`,
      everyone: `${E.error} @everyone doesn't work here.`,
      panelRequired: `${E.error} Choose a panel.`,
      channelRequired: `${E.error} Choose a text channel.`,
      imageInvalid: `${E.error} The image link must start with https://`,
    },
  },
  {
    description: "إعداد التكتات ونشر لوحاتها",
    setup: "ضبط رتبة الدعم والمسؤول والكاتيقوري لنوع تكت",
    send: "نشر لوحة تكتات في روم",

    setupModal: {
      title: "إعداد تكت",
      typeLabel: "نوع التكت",
      typePlaceholder: "اختر النوع",
      supportLabel: "رتبة الدعم",
      supportDescription: "إجبارية لتكتات الدعم، اختيارية للتقديم والنقل ودعم الإدارة",
      managerLabel: "رتبة مسؤول التكت (اختياري)",
      managerDescription: "يشوف التكت ويديره، بس ما يستلمه",
      categoryLabel: "كاتيقوري التكت",
      categoryDescription: "مكان فتح رومات هذا التكت",
      logLabel: "روم لوق التكت (اختياري)",
      logDescription: "بدونه يروح اللوق لروم لوق التكتات العام",
    },

    sendModal: {
      title: "نشر لوحة تكتات",
      panelLabel: "اللوحة",
      panelPlaceholder: "اختر اللوحة",
      channelLabel: "الروم",
      channelDescription: "مكان نشر اللوحة",
      titleLabel: "العنوان (لوحة المسؤوليات)",
      descriptionLabel: "الوصف (لوحة المسؤوليات)",
      imageLabel: "رابط صورة (لوحة المسؤوليات)",
      optionalPlaceholder: "اختياري؛ فاضي = النص الافتراضي",
    },

    kinds: {
      [TicketPanelKind.MAIN]: "لوحة التكتات الرئيسية",
      [TicketPanelKind.STAFF]: "لوحة دعم الإدارة",
      [TicketPanelKind.RESPONSIBILITY]: "لوحة التقديم على مسؤولية",
    } as Record<string, string>,

    setupDone: (panelName: string, supportRoleId: string | null, managerRoleId: string | null, categoryId: string | null, logChannelId: string | null) =>
      [
        `${E.success} تم ضبط تكت **${panelName}**.`,
        `**رتبة الدعم:** ${role(supportRoleId, "ما فيه (يُستخدم المضبوط)")}`,
        `**المسؤول:** ${role(managerRoleId, "ما فيه")}`,
        `**الكاتيقوري:** ${categoryId ? `<#${categoryId}>` : "—"}`,
        `**روم اللوق:** ${logChannelId ? `<#${logChannelId}>` : "لوق التكتات العام"}`,
      ].join("\n"),
    sent: (kind: string, channelId: string, created: boolean) => `${E.success} ${created ? "تم نشر" : "تم تحديث"} ${kind} في <#${channelId}>.`,
    hiddenNotSetUp: (names: string[]) => `${E.warning} مخفية لين تنضبط بـ \`/ticket setup\`: ${names.map((n) => `**${n}**`).join("، ")}`,

    errors: {
      adminOnly: `${E.error} للأدمن بس.`,
      typeRequired: `${E.error} اختر نوع التكت.`,
      notConfigurable: (panelName: string) => `${E.error} **${panelName}** ما يفتح تكت؛ اضبط رومه من الداشبورد (الرومات) ورتبة مسؤوله من الرتب.`,
      supportRequired: (panelName: string) => `${E.error} تكت **${panelName}** يحتاج رتبة دعم.`,
      categoryRequired: `${E.error} التكت يفتح روم وما له كاتيقوري؛ اختر واحد.`,
      everyone: `${E.error} @everyone ما تنفع هنا.`,
      panelRequired: `${E.error} اختر اللوحة.`,
      channelRequired: `${E.error} اختر روم نصي.`,
      imageInvalid: `${E.error} رابط الصورة لازم يبدأ بـ https://`,
    },
  },
);
