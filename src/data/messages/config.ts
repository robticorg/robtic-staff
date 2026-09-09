export const configMessages = {
  role: {
    startConfigured: "تم ضبط رتبة بداية الستاف.",
    hierarchyUpdated: "تم تحديث ترتيب رتب الستاف المرقّمة.",
    levelsHeader: "المستويات:",
    ignoredConfigured: "تم ضبط الرتبة المستثناة.",
    ignoredNote: "هذي الرتبة ما راح تحسب أبداً كمستوى ستاف مرقّم.",
    warnConfigured: "تم ضبط رتب تحذيرات الستاف.",
    warnNote: "هذي الرتب لتحذيرات **الستاف** بس، مو لتحذيرات الأعضاء العاديين.",
    notNumberedNote: "هذي الرتبة مو ضمن ترتيب رتب الستاف المرقّمة.",
    needStartFirst: "اضبط رتبة البداية أول عن طريق `/role start`.",
    singletonConfigured: (label: string) => `تم ضبط ${label}.`,

    roleLine: (roleId: string) => `الرتبة:\n<@&${roleId}>`,
    levelLine: (level: number) => `المستوى:\n${level}`,
    ladderRung: (level: number, roleId: string) => `\`${level}\` <@&${roleId}>`,
    endLevelLine: (level: number) => `\nالنهاية = المستوى ${level}`,
    warnLine: (index: 1 | 2 | 3, roleId: string) => `تحذير ${index}: <@&${roleId}>`,

    startRoleMissing: "رتبة البداية المضبوطة ما عادت موجودة. أعد تشغيل `/role start`.",
    endRoleNotFound: "الرتبة النهائية المختارة ما لقيتها في هذا السيرفر.",
    endBelowStart:
      "لازم تكون الرتبة النهائية **فوق** رتبة البداية في قائمة رتب السيرفر.",
    ladderNeedsStart: "لازم يحتوي السلّم على رتبة البداية على الأقل",
    ladderDuplicateRoles: "السلّم فيه رتب مكررة",
  },

  channels: {
    configured: "تم ضبط الروم.",
    slotLine: (type: string) => `الخانة:\n\`${type}\``,
    channelLine: (channelId: string) => `الروم:\n<#${channelId}>`,
    unknownType: (type: string) => `نوع روم غير معروف: \`${type}\``,
    overviewTitle: (botName: string) => `**إعدادات رومات ${botName}**`,
    notConfigured: "*غير مضبوط*",
    entry: (label: string, value: string) => `${label}: ${value}`,
    channelMention: (channelId: string) => `<#${channelId}>`,
    group: (name: string) => `__${name}__`,
  },
} as const;
