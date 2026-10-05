import { emojis } from "../emojis/index.ts";

const E = emojis;

export const TicketPanelKind = {
  MAIN: "main",
  STAFF: "staff",
  RESPONSIBILITY: "responsibility",
} as const;
export type TicketPanelKind = (typeof TicketPanelKind)[keyof typeof TicketPanelKind];
export const TICKET_PANEL_KIND_VALUES: readonly string[] = Object.values(TicketPanelKind);

export const ticketSetupCommandMessages = {
  description: "إعداد التكتات ونشر لوحاتها",
  setup: "ضبط رتبة الدعم والمسؤول والكاتيقوري لنوع تكت",
  send: "نشر لوحة تكتات في روم",

  setupModal: {
    title: "إعداد تكت",
    typeLabel: "نوع التكت",
    typePlaceholder: "اختر نوع التكت",
    supportLabel: "رتبة الدعم",
    supportDescription: "تشوف التكت وتقدر تستلمه",
    managerLabel: "رتبة مسؤول التكت (اختياري)",
    managerDescription: "تشوف التكت وتديره، بس ما تقدر تستلمه",
    categoryLabel: "كاتيقوري التكت",
    categoryDescription: "الكاتيقوري اللي تنفتح فيه رومات هذا التكت",
  },

  sendModal: {
    title: "نشر لوحة تكتات",
    panelLabel: "اللوحة",
    panelPlaceholder: "اختر اللوحة",
    channelLabel: "الروم",
    channelDescription: "الروم اللي تنرسل فيه اللوحة",
    titleLabel: "العنوان (لوحة المسؤوليات)",
    descriptionLabel: "الوصف (لوحة المسؤوليات)",
    imageLabel: "رابط صورة (لوحة المسؤوليات)",
    optionalPlaceholder: "اختياري — اتركه فاضي للنص الافتراضي",
  },

  kinds: {
    [TicketPanelKind.MAIN]: "لوحة التكتات الرئيسية",
    [TicketPanelKind.STAFF]: "لوحة دعم الستاف",
    [TicketPanelKind.RESPONSIBILITY]: "لوحة التقديم على مسؤولية",
  } as Record<string, string>,

  setupDone: (panelName: string, supportRoleId: string, managerRoleId: string | null, categoryId: string | null) =>
    [
      `${E.success} تم ضبط تكت **${panelName}**.`,
      `**رتبة الدعم:** <@&${supportRoleId}>`,
      `**مسؤول التكت:** ${managerRoleId ? `<@&${managerRoleId}>` : "ما فيه"}`,
      `**الكاتيقوري:** ${categoryId ? `<#${categoryId}>` : "—"}`,
    ].join("\n"),
  sent: (kind: string, channelId: string, created: boolean) =>
    `${E.success} ${created ? "تم نشر" : "تم تحديث"} ${kind} في <#${channelId}>.`,

  errors: {
    adminOnly: `${E.error} هذا للأدمن بس.`,
    typeRequired: `${E.error} لازم تختار نوع التكت.`,
    supportRequired: `${E.error} لازم تختار رتبة الدعم.`,
    categoryRequired: `${E.error} هذا التكت يفتح روم، لازم تختار كاتيقوري.`,
    everyone: `${E.error} رتبة @everyone ما تنفع هنا.`,
    panelRequired: `${E.error} لازم تختار اللوحة.`,
    channelRequired: `${E.error} لازم تختار روم نصي.`,
    imageInvalid: `${E.error} رابط الصورة لازم يبدأ بـ https://`,
  },
} as const;
