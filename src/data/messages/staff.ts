import { emojis } from "../emojis/index.ts";

const E = emojis;

export const staffMessages = {
  points: {
    reportClaimReason: (caseId: string) => `استلام البلاغ ${caseId}`,
    ticketClaimReason: (ticketId: string) => `استلام التكت ${ticketId}`,
  },

  /**
   * Denial copy for the central Staff management authorization service.
   * Every string is keyed by a DenyReason so the service never formats text.
   */
  authorization: {
    NOT_A_MANAGER: `${E.error} ما عندك صلاحية تستخدم أوامر إدارة الستاف.`,
    NOT_A_MANAGER_DEMOTE: `${E.error} ما عندك صلاحية تستخدم أمر الديموت.`,

    SELF_PROMOTE: `${E.error} ما تقدر ترقي نفسك.`,
    SELF_DEMOTE: `${E.error} ما تقدر تنزل رتبتك بنفسك.`,
    SELF_ACCEPT: `${E.error} ما تقدر تقبل نفسك في الستاف.`,
    SELF_FIRE: `${E.error} ما تقدر تفصل نفسك.`,

    TARGET_ABOVE_ACTOR: `${E.error} ما تقدر تتحكم بستاف رتبته أعلى من رتبتك.`,
    TARGET_ABOVE_ACTOR_DEMOTE: `${E.error} ما تقدر تنزل ستاف رتبته أعلى من رتبتك.`,
    LEVEL_ABOVE_ACTOR: `${E.error} ما عندك صلاحية ترقي هذا العضو لهذا المستوى.`,
    LEVEL_ABOVE_AUTHORITY: `${E.error} ما عندك صلاحية ترقي أحد لهذا المستوى.`,

    TARGET_IN_OWNER: `${E.error} ما عندك صلاحية تنزل ستاف من رتبة الأونر أو أعلى.`,
    TARGET_IN_SHIP: `${E.error} ما عندك صلاحية تنزل ستاف من رتبة الشيب.`,
    TARGET_IN_SHIP_MANAGE: `${E.error} ما عندك صلاحية تتحكم بستاف من رتبة الشيب.`,
    LEVEL_IN_SHIP: `${E.error} ما تقدر ترقي أحد إلى مستويات الشيب.`,
    ACCEPT_IN_SHIP: `${E.error} ما تقدر تقبل أحد مباشرة في مستويات الشيب.`,

    ACTOR_NOT_STAFF: `${E.error} لازم تكون عضو ستاف عنده رتبة مرقّمة عشان تدير الستاف.`,
    HIERARCHY_INVALID: `${E.error} إعدادات سلّم الستاف ناقصة أو غير صحيحة — صحّحها قبل إدارة الستاف.`,
    BELOW_MIN_LEVEL: `${E.error} ما تقدر تنزل هذا الستاف أكثر. إذا تبي تفصله استخدم \`!fire\`.`,
  },
} as const;
