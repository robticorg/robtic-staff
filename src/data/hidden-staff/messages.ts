import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const hiddenStaffMessages = bilingual(
  {
    config: {
      startLabel: "Hidden staff start",
      endLabel: "Hidden staff end",
      ignoreLabel: "Role left out of hidden staff",
      unignoreLabel: "Stop leaving a role out of hidden staff",
      startSet: (roleId: string) => `${E.success} Hidden staff start: <@&${roleId}>`,
      endSet: (roleId: string) => `${E.success} Hidden staff end: <@&${roleId}>`,
      ignoredAdded: (roleId: string) => `${E.success} <@&${roleId}> is now left out of the hidden ladder.`,
      ignoredRemoved: (roleId: string) => `${E.success} <@&${roleId}> is back on the hidden ladder.`,
      notIgnored: (roleId: string) => `${E.warning} <@&${roleId}> isn't left out.`,
      ignoreEdge: `${E.error} You can't leave out the start or end role.`,
      ladderTitle: "**Hidden staff ladder:**",
      ladderRow: (level: number, roleId: string) => `${level}. <@&${roleId}>`,
      waitingForOther: "-# Set the other end (start or end) to complete the ladder.",
      problems: {
        NOT_CONFIGURED: `${E.warning} Hidden staff isn't set up. Set the start and end roles.`,
        START_MISSING: `${E.error} The hidden staff start role no longer exists.`,
        END_MISSING: `${E.error} The hidden staff end role no longer exists.`,
        END_BELOW_START: `${E.error} The start role must be below the end role in Discord's order.`,
        START_IGNORED: `${E.error} The start role is left out; undo that first.`,
        END_IGNORED: `${E.error} The end role is left out; undo that first.`,
        NO_LEVELS: `${E.error} No valid levels between the start and end.`,
      } as Record<string, string>,
    },

    command: {
      usage: `${E.warning} Usage: \`!hidden @member\`; to remove: \`!hidden remove @member\``,
      notManager: `${E.error} Hidden staff is for admins only.`,
      notStaff: (userId: string) => `${E.error} <@${userId}> isn't staff. Accept them as hidden first: \`!accept @member hidden\`.`,
      pickTitle: (userId: string) => `### 🕶️ Choose <@${userId}>'s hidden level`,
      pickPlaceholder: "Choose a hidden level",
      optionDescription: (level: number, max: number) => `Level ${level} of ${max}`,
      notAuthor: `${E.error} This menu is for whoever ran the command.`,
      levelSet: (userId: string, roleId: string) => `${E.success} <@${userId}> is hidden staff at <@&${roleId}>.`,
      removed: (userId: string) => `${E.success} <@${userId}> removed from hidden staff. Their regular roles stay.`,
      notHidden: (userId: string) => `${E.warning} <@${userId}> isn't hidden staff.`,
      levelGone: `${E.error} That level no longer exists. Run the command again.`,
    },

    moves: {
      promoted: (userId: string, fromRoleId: string, toRoleId: string) => `${E.success} <@${userId}> promoted (hidden): <@&${fromRoleId}> → <@&${toRoleId}>`,
      demoted: (userId: string, fromRoleId: string, toRoleId: string) => `${E.success} <@${userId}> demoted (hidden): <@&${fromRoleId}> → <@&${toRoleId}>`,
      alreadyTop: (userId: string) => `${E.warning} <@${userId}> is already at the top hidden level.`,
      alreadyBottom: (userId: string) => `${E.warning} <@${userId}> is at the first hidden level. To remove: \`!hidden remove\`.`,
    },

    accept: {
      acceptedHidden: (userId: string, roleId: string) => `🕶️ <@${userId}> is hidden staff at <@&${roleId}>.`,
    },

    authorization: {
      hiddenTargetAdminOnly: `${E.error} They're hidden staff; only admins can promote or demote them.`,
    },

    stats: {
      hiddenUser: "This member is hidden staff.",
      status: "**Status:** hidden staff",
      level: (name: string) => `**Hidden level:** ${name}`,
    },
  },
  {
    config: {
      startLabel: "بداية الطاقم المخفي",
      endLabel: "نهاية الطاقم المخفي",
      ignoreLabel: "رتبة مستثناة من الطاقم المخفي",
      unignoreLabel: "إلغاء استثناء رتبة من الطاقم المخفي",
      startSet: (roleId: string) => `${E.success} بداية الطاقم المخفي: <@&${roleId}>`,
      endSet: (roleId: string) => `${E.success} نهاية الطاقم المخفي: <@&${roleId}>`,
      ignoredAdded: (roleId: string) => `${E.success} صارت <@&${roleId}> مستثناة من السلّم المخفي.`,
      ignoredRemoved: (roleId: string) => `${E.success} رجعت <@&${roleId}> للسلّم المخفي.`,
      notIgnored: (roleId: string) => `${E.warning} <@&${roleId}> مو مستثناة.`,
      ignoreEdge: `${E.error} ما تستثني رتبة البداية أو النهاية.`,
      ladderTitle: "**سلّم الطاقم المخفي:**",
      ladderRow: (level: number, roleId: string) => `${level}. <@&${roleId}>`,
      waitingForOther: "-# اضبط الطرف الثاني (البداية أو النهاية) ليكتمل السلّم.",
      problems: {
        NOT_CONFIGURED: `${E.warning} الطاقم المخفي غير مضبوط. حدّد البداية والنهاية.`,
        START_MISSING: `${E.error} رتبة بداية الطاقم المخفي ما عادت موجودة.`,
        END_MISSING: `${E.error} رتبة نهاية الطاقم المخفي ما عادت موجودة.`,
        END_BELOW_START: `${E.error} لازم البداية تحت النهاية في ترتيب ديسكورد.`,
        START_IGNORED: `${E.error} رتبة البداية مستثناة؛ شيل الاستثناء أول.`,
        END_IGNORED: `${E.error} رتبة النهاية مستثناة؛ شيل الاستثناء أول.`,
        NO_LEVELS: `${E.error} ما فيه مستويات صالحة بين البداية والنهاية.`,
      } as Record<string, string>,
    },

    command: {
      usage: `${E.warning} الطريقة: \`!hidden @عضو\`، وللإزالة: \`!hidden remove @عضو\``,
      notManager: `${E.error} الطاقم المخفي للأدمن بس.`,
      notStaff: (userId: string) => `${E.error} <@${userId}> مو إداري. اقبله كمخفي أول: \`!accept @عضو hidden\`.`,
      pickTitle: (userId: string) => `### 🕶️ اختر مستوى <@${userId}> المخفي`,
      pickPlaceholder: "اختر المستوى المخفي",
      optionDescription: (level: number, max: number) => `المستوى ${level} من ${max}`,
      notAuthor: `${E.error} القائمة لصاحب الأمر بس.`,
      levelSet: (userId: string, roleId: string) => `${E.success} صار <@${userId}> مخفي بمستوى <@&${roleId}>.`,
      removed: (userId: string) => `${E.success} تمت إزالة <@${userId}> من الطاقم المخفي، ورتبه العادية باقية.`,
      notHidden: (userId: string) => `${E.warning} <@${userId}> مو مخفي.`,
      levelGone: `${E.error} المستوى ما عاد موجود. شغّل الأمر من جديد.`,
    },

    moves: {
      promoted: (userId: string, fromRoleId: string, toRoleId: string) => `${E.success} ترقية <@${userId}> (مخفي): <@&${fromRoleId}> ← <@&${toRoleId}>`,
      demoted: (userId: string, fromRoleId: string, toRoleId: string) => `${E.success} تنزيل <@${userId}> (مخفي): <@&${fromRoleId}> ← <@&${toRoleId}>`,
      alreadyTop: (userId: string) => `${E.warning} <@${userId}> في أعلى مستوى مخفي.`,
      alreadyBottom: (userId: string) => `${E.warning} <@${userId}> في أول مستوى مخفي. للإزالة: \`!hidden remove\`.`,
    },

    accept: {
      acceptedHidden: (userId: string, roleId: string) => `🕶️ صار <@${userId}> مخفي بمستوى <@&${roleId}>.`,
    },

    authorization: {
      hiddenTargetAdminOnly: `${E.error} هذا إداري مخفي؛ ترقيته وتنزيله للأدمن بس.`,
    },

    stats: {
      hiddenUser: "هذا العضو إداري مخفي.",
      status: "**الحالة:** إداري مخفي",
      level: (name: string) => `**المستوى المخفي:** ${name}`,
    },
  },
);
