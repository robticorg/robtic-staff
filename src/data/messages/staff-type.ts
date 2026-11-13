import { bilingual } from "../../shared/utils/lang-context.ts";

export const staffTypeMessages = bilingual(
  {
    title: "Staff type role set.",
    configured: (typeLabel: string, roleId: string) => `**${typeLabel}** is now tied to <@&${roleId}>.`,
    usage: (slug: string) => `Given with \`!accept @user ${slug}\`.`,
    note: "The type role is separate from the staff ladder: no level, and it doesn't change on promotion or demotion.",
    problems: {
      UNKNOWN_TYPE: "Unknown staff type.",
      MISSING: "Give a role.",
      EVERYONE: "@everyone doesn't work.",
      MANAGED: "That role belongs to a bot or integration.",
      UNMANAGEABLE: "That role is above mine. Move my role above it.",
      RESERVED: (conflict: string) => `That role is already used as **${conflict}**. Pick another; a type role can't be on the ladder.`,
    },
  },
  {
    title: "تم ضبط رتبة نوع الإداري.",
    configured: (typeLabel: string, roleId: string) => `صار **${typeLabel}** مربوط بـ <@&${roleId}>.`,
    usage: (slug: string) => `تنعطى بـ \`!accept @user ${slug}\`.`,
    note: "رتبة النوع مستقلة عن السلّم: بدون مستوى، وما تتغير مع الترقية أو التنزيل.",
    problems: {
      UNKNOWN_TYPE: "نوع إداري غير معروف.",
      MISSING: "حدد رتبة.",
      EVERYONE: "@everyone ما تنفع.",
      MANAGED: "الرتبة تابعة لبوت أو تكامل.",
      UNMANAGEABLE: "الرتبة فوق رتبتي. ارفع رتبتي فوقها.",
      RESERVED: (conflict: string) => `الرتبة مستخدمة كـ **${conflict}**. اختر غيرها؛ رتبة النوع ما تكون في السلّم.`,
    },
  },
);
