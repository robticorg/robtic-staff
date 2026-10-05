import { emojis } from "../emojis/index.ts";

const E = emojis;

export const hiddenStaffMessages = {
  config: {
    startLabel: "بداية الستاف المخفي",
    endLabel: "نهاية الستاف المخفي",
    ignoreLabel: "رتبة مستثناة من الستاف المخفي",
    unignoreLabel: "إلغاء استثناء رتبة من الستاف المخفي",
    startSet: (roleId: string) => `${E.success} تم ضبط بداية الستاف المخفي: <@&${roleId}>`,
    endSet: (roleId: string) => `${E.success} تم ضبط نهاية الستاف المخفي: <@&${roleId}>`,
    ignoredAdded: (roleId: string) => `${E.success} صارت <@&${roleId}> مستثناة من سلّم الستاف المخفي.`,
    ignoredRemoved: (roleId: string) => `${E.success} تم إلغاء استثناء <@&${roleId}> من سلّم الستاف المخفي.`,
    notIgnored: (roleId: string) => `${E.warning} <@&${roleId}> مو مستثناة أصلاً.`,
    ignoreEdge: `${E.error} ما تقدر تستثني رتبة البداية أو النهاية.`,
    ladderTitle: "**سلّم الستاف المخفي:**",
    ladderRow: (level: number, roleId: string) => `${level}. <@&${roleId}>`,
    waitingForOther: "-# اضبط الطرف الثاني (البداية أو النهاية) عشان يكتمل السلّم.",
    problems: {
      NOT_CONFIGURED: `${E.warning} الستاف المخفي مو مضبوط. اضبط البداية والنهاية من \`/role set\`.`,
      START_MISSING: `${E.error} رتبة بداية الستاف المخفي ما عادت موجودة.`,
      END_MISSING: `${E.error} رتبة نهاية الستاف المخفي ما عادت موجودة.`,
      END_BELOW_START: `${E.error} لازم تكون رتبة البداية تحت رتبة النهاية في ترتيب رتب ديسكورد.`,
      START_IGNORED: `${E.error} رتبة البداية مستثناة — شيل الاستثناء أول.`,
      END_IGNORED: `${E.error} رتبة النهاية مستثناة — شيل الاستثناء أول.`,
      NO_LEVELS: `${E.error} ما فيه ولا مستوى صالح بين البداية والنهاية.`,
    } as Record<string, string>,
  },

  command: {
    usage: `${E.warning} الطريقة: \`!hidden @عضو\` — وللإزالة: \`!hidden remove @عضو\``,
    notManager: `${E.error} إدارة الستاف المخفي للأدمن بس.`,
    notStaff: (userId: string) =>
      `${E.error} <@${userId}> مو ستاف. اقبله أول كستاف مخفي بـ \`!accept @عضو hidden\`.`,
    pickTitle: (userId: string) => `### 🕶️ اختر مستوى الموظف المخفي لـ <@${userId}>`,
    pickPlaceholder: "اختر مستوى الموظف المخفي",
    optionDescription: (level: number, max: number) => `المستوى ${level} من ${max}`,
    notAuthor: `${E.error} هذي القائمة لصاحب الأمر بس.`,
    levelSet: (userId: string, roleId: string) => `${E.success} صار <@${userId}> موظف مخفي بمستوى <@&${roleId}>.`,
    removed: (userId: string) => `${E.success} تم شيل <@${userId}> من الستاف المخفي. رتبه العادية باقية مثل ما هي.`,
    notHidden: (userId: string) => `${E.warning} <@${userId}> مو موظف مخفي.`,
    levelGone: `${E.error} هذا المستوى ما عاد موجود. شغّل الأمر من جديد.`,
  },

  moves: {
    promoted: (userId: string, fromRoleId: string, toRoleId: string) =>
      `${E.success} تمت ترقية <@${userId}> في الستاف المخفي: <@&${fromRoleId}> ← <@&${toRoleId}>`,
    demoted: (userId: string, fromRoleId: string, toRoleId: string) =>
      `${E.success} تم تنزيل <@${userId}> في الستاف المخفي: <@&${fromRoleId}> ← <@&${toRoleId}>`,
    alreadyTop: (userId: string) => `${E.warning} <@${userId}> في أعلى مستوى في الستاف المخفي أصلاً.`,
    alreadyBottom: (userId: string) =>
      `${E.warning} <@${userId}> في أول مستوى في الستاف المخفي، ما ينزل أكثر. للإزالة استخدم \`!hidden remove\`.`,
  },

  accept: {
    acceptedHidden: (userId: string, roleId: string) => `🕶️ وصار <@${userId}> موظف مخفي بمستوى <@&${roleId}>.`,
  },

  authorization: {
    hiddenTargetAdminOnly: `${E.error} هذا موظف مخفي — ترقيته وتنزيله للأدمن بس.`,
  },

  stats: {
    hiddenUser: "هذا المستخدم موظف مخفي.",
    status: "**الحالة:** موظف مخفي",
    level: (name: string) => `**المستوى المخفي:** ${name}`,
  },
} as const;
