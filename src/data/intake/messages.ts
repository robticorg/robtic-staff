import { emojis } from "../emojis/index.ts";

const E = emojis;

export const intakeMessages = {
  /** Shown to a member who picks something that's closed. */
  closed: (label: string, reason: string | null) =>
    [`${E.error} **${label}** مقفل حالياً.`, reason ? `السبب: ${reason}` : null]
      .filter(Boolean)
      .join("\n"),

  allApplicationsLabel: "كل التقديمات (تقديم جديد + نقل)",
  departmentLabel: (department: string) => `تقديم ${department}`,
  allDepartmentsClosed: `${E.error} كل أقسام التقديم مقفلة حالياً.`,

  command: {
    description: "قفل أو فتح التقديمات والتكتات",
    close: "قفل تقديم أو تكت — ما أحد يقدر يفتح جديد",
    open: "فتح تقديم أو تكت مقفل",
    list: "عرض كل التقديمات والتكتات وحالتها",
    target: "التقديم أو التكت",
    reason: "السبب (يظهر للعضو)",

    unknownTarget: "هذا الخيار غير معروف — اختر من القائمة.",
    closedDone: (label: string) => `${E.success} تم قفل **${label}**. التكتات المفتوحة ما تتأثر.`,
    openedDone: (label: string) => `${E.success} تم فتح **${label}**.`,
    openedNotSetUp: (label: string) =>
      `${E.success} تم فتح **${label}** — بس ما بيظهر في اللوحة لين يتضبط بـ \`/ticket setup\`.`,
    alreadyClosed: (label: string) => `${E.warning} **${label}** مقفل أصلاً.`,
    alreadyOpen: (label: string) => `${E.warning} **${label}** مفتوح أصلاً.`,

    listTitle: "**حالة التقديمات والتكتات**",
    applicationsGroup: "__التقديمات__",
    ticketsGroup: "__التكتات__",
    openRow: (label: string) => `🟢 ${label}`,
    notSetUpRow: (label: string) => `🔴 ${label} — مو مضبوط (يتفتح لحاله بعد \`/ticket setup\`)`,
    closedRow: (label: string, by: string, at: Date, reason: string | null) =>
      `🔴 ${label} — قفله <@${by}> <t:${Math.floor(at.getTime() / 1000)}:R>${reason ? ` — ${reason}` : ""}`,
  },
} as const;
