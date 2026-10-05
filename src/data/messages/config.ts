export const configMessages = {
  role: {
    startConfigured: "تم ضبط رتبة بداية الطاقم الاداري.",
    hierarchyUpdated: "تم تحديث ترتيب رتب الطاقم الاداري المرقّمة.",
    levelsHeader: "المستويات:",
    ignoredConfigured: "تم ضبط الرتبة المستثناة.",
    ignoredNote: "هذي الرتبة ما راح تحسب أبداً كمستوى اداري مرقّم.",
    warnNote: "هذي الرتب لتحذيرات **الطاقم الاداري** بس، مو لتحذيرات الأعضاء العاديين.",
    notNumberedNote: "هذي الرتبة مو ضمن ترتيب رتب الطاقم الاداري المرقّمة.",
    needStartFirst: "اضبط رتبة البداية أول عن طريق `/role set type:رتبة بداية الطاقم الاداري`.",
    singletonConfigured: (label: string) => `تم ضبط ${label}.`,

    roleLine: (roleId: string) => `الرتبة:\n<@&${roleId}>`,
    levelLine: (level: number) => `المستوى:\n${level}`,
    ladderRung: (level: number, roleId: string) => `\`${level}\` <@&${roleId}>`,
    endLevelLine: (level: number) => `\nالنهاية = المستوى ${level}`,

    startRoleMissing: "رتبة البداية المضبوطة ما عادت موجودة. أعد تشغيل `/role set type:رتبة بداية الطاقم الاداري`.",
    endRoleNotFound: "الرتبة النهائية المختارة ما لقيتها في هذا السيرفر.",
    endBelowStart:
      "لازم تكون الرتبة النهائية **فوق** رتبة البداية في قائمة رتب السيرفر.",
    ladderNeedsStart: "لازم يحتوي السلّم على رتبة البداية على الأقل",
    ladderDuplicateRoles: "السلّم فيه رتب مكررة",

    unknownSlot: (type: string) => `خانة رتبة غير معروفة: \`${type}\``,
    rangeRoleRequired: "لازم تحدد `role` مع هذا النوع.",
  },

  roleOverview: {
    title: (botName: string) => `**رتب نظام الطاقم الاداري ${botName}**`,
    group: (name: string) => `__${name}__`,
    entry: (label: string, value: string) => `${label}: ${value}`,
    notConfigured: "*غير مضبوط*",
    empty: "*ما فيه*",
    nothingConfigured: "ما تم ضبط ولا رتبة بعد — ابدأ بـ `/role set type:رتبة بداية الطاقم الاداري` و `/role set type:رتبة نهاية الطاقم الاداري`.",

    ladderHeading: "سلّم الطاقم الاداري المرقّم",
    ladderEmpty: "*السلّم مو مضبوط — استخدم `/role set type:رتبة بداية الطاقم الاداري` و `/role set type:رتبة نهاية الطاقم الاداري`.*",
    tiersHeading: "التصنيفات",
    tierLine: (label: string, roleId: string, level: number | null) =>
      level === null ? `${label}: <@&${roleId}>` : `${label}: <@&${roleId}> (المستوى ${level})`,
    singletonsHeading: "الرتب المفردة",
    accessHeading: "رتب الوصول",
    ignoredHeading: "الرتب المستثناة",
    assignHeading: "الرتب التلقائية حسب المستوى",
    staffTypesHeading: "رتب أنواع الطاقم الاداري",

    roleMention: (roleId: string) => `<@&${roleId}>`,
    rangeLine: (roleId: string, from: number | null, to: number | null) =>
      from === null && to === null
        ? `<@&${roleId}> — كل المستويات`
        : `<@&${roleId}> — من المستوى ${from ?? 0} إلى ${to ?? "النهاية"}`,
    missingRole: (roleId: string) => `<@&${roleId}> ${"⚠️ (الرتبة محذوفة)"}`,
  },

  ownerWarns: {
    configured: "تم ضبط رتب تحذيرات الأونر.",
    note: "هذي الرتب لتحذيرات اداري **الأونر** بس — منفصلة تماماً عن رتب تحذيرات الطاقم الاداري العادية.",
    line: (index: number, roleId: string) => `تحذير أونر ${index}: <@&${roleId}>`,
    lineUnset: (index: number) => `تحذير أونر ${index}: *غير مضبوط*`,

    duplicate: "لازم تكون الرتب الثلاث مختلفة عن بعض.",
    everyone: "ما تقدر تستخدم رتبة @everyone كرتبة تحذير.",
    managed: (roleId: string) => `<@&${roleId}> رتبة تابعة لتطبيق/بوت وما تنعطى يدوياً.`,
    unmanageable: (roleId: string) =>
      `<@&${roleId}> فوق رتبة البوت — ارفع رتبة البوت فوقها عشان يقدر يعطيها ويشيلها.`,
    onLadder: (roleId: string) =>
      `<@&${roleId}> رتبة ضمن سلّم الطاقم الاداري المرقّم — ما تنفع كرتبة تحذير.`,
    reserved: (roleId: string, label: string) =>
      `<@&${roleId}> مستخدمة أصلاً كـ "${label}" — اختر رتبة ثانية.`,
  },

  channels: {
    configured: "تم ضبط الروم.",
    slotLine: (type: string) => `الخانة:\n\`${type}\``,
    channelLine: (channelId: string) => `الروم:\n<#${channelId}>`,
    unknownType: (type: string) => `نوع روم غير معروف: \`${type}\``,
    categoryRequired: "هذي الخانة تحتاج كاتيقوري، مو روم.",
    textRequired: "هذي الخانة تحتاج روم نصي، مو كاتيقوري.",
    overviewTitle: (botName: string) => `**إعدادات رومات ${botName}**`,
    notConfigured: "*غير مضبوط*",
    entry: (label: string, value: string) => `${label}: ${value}`,
    channelMention: (channelId: string) => `<#${channelId}>`,
    group: (name: string) => `__${name}__`,
  },
} as const;
