import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const rel = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;

export const intakeMessages = bilingual(
  {
    /** Shown to a member who picks something that's closed. */
    closed: (label: string, reason: string | null) => `${E.error} **${label}** is closed right now.${reason ? ` Reason: ${reason}` : ""}`,
    allApplicationsLabel: "All applications (new + transfer)",
    departmentLabel: (department: string) => `${department} applications`,
    allDepartmentsClosed: `${E.error} Every application area is closed right now.`,

    command: {
      description: "Close or open applications and tickets",
      close: "Close an application or ticket type to new requests",
      open: "Open a closed application or ticket type",
      list: "Show every application and ticket type and its state",
      target: "The application or ticket type",
      reason: "Reason (members see it)",
      unknownTarget: "Unknown option; pick from the list.",
      closedDone: (label: string) => `${E.success} **${label}** closed. Open tickets aren't affected.`,
      openedDone: (label: string) => `${E.success} **${label}** opened.`,
      openedNotSetUp: (label: string) => `${E.success} **${label}** opened, but it won't show on the panel until set up with \`/ticket setup\`.`,
      alreadyClosed: (label: string) => `${E.warning} **${label}** is already closed.`,
      alreadyOpen: (label: string) => `${E.warning} **${label}** is already open.`,
      listTitle: "**Applications and tickets**",
      applicationsGroup: "__Applications__",
      ticketsGroup: "__Tickets__",
      openRow: (label: string) => `🟢 ${label}`,
      notSetUpRow: (label: string) => `🔴 ${label} — not set up (opens after \`/ticket setup\`)`,
      closedRow: (label: string, by: string, at: Date, reason: string | null) => `🔴 ${label} — closed by <@${by}> ${rel(at)}${reason ? ` — ${reason}` : ""}`,
    },
  },
  {
    closed: (label: string, reason: string | null) => `${E.error} **${label}** مقفل حالياً.${reason ? ` السبب: ${reason}` : ""}`,
    allApplicationsLabel: "كل التقديمات (جديد + نقل)",
    departmentLabel: (department: string) => `تقديم ${department}`,
    allDepartmentsClosed: `${E.error} كل أقسام التقديم مقفلة حالياً.`,

    command: {
      description: "قفل أو فتح التقديمات والتكتات",
      close: "قفل تقديم أو نوع تكت عن الطلبات الجديدة",
      open: "فتح تقديم أو تكت مقفل",
      list: "عرض التقديمات والتكتات وحالتها",
      target: "التقديم أو التكت",
      reason: "السبب (يشوفه العضو)",
      unknownTarget: "خيار غير معروف؛ اختر من القائمة.",
      closedDone: (label: string) => `${E.success} تم قفل **${label}**. التكتات المفتوحة ما تتأثر.`,
      openedDone: (label: string) => `${E.success} تم فتح **${label}**.`,
      openedNotSetUp: (label: string) => `${E.success} تم فتح **${label}**، بس ما يظهر في اللوحة لين يتضبط بـ \`/ticket setup\`.`,
      alreadyClosed: (label: string) => `${E.warning} **${label}** مقفل أصلاً.`,
      alreadyOpen: (label: string) => `${E.warning} **${label}** مفتوح أصلاً.`,
      listTitle: "**حالة التقديمات والتكتات**",
      applicationsGroup: "__التقديمات__",
      ticketsGroup: "__التكتات__",
      openRow: (label: string) => `🟢 ${label}`,
      notSetUpRow: (label: string) => `🔴 ${label} — غير مضبوط (يتفتح بعد \`/ticket setup\`)`,
      closedRow: (label: string, by: string, at: Date, reason: string | null) => `🔴 ${label} — قفله <@${by}> ${rel(at)}${reason ? ` — ${reason}` : ""}`,
    },
  },
);
