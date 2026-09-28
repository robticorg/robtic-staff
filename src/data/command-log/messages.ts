import { emojis } from "../emojis/index.ts";

const E = emojis;

export const commandLogMessages = {
  headings: {
    SUCCESS: `${E.success} **أمر تم تنفيذه**`,
    DENIED: `${E.warning} **أمر مرفوض**`,
    ERROR: `${E.error} **أمر فشل**`,
  },

  labels: {
    command: "الأمر",
    actor: "المنفّذ",
    channel: "الروم",
    targets: "المستهدف",
    detail: "السبب",
    time: "الوقت",
    link: "الرسالة",
  },

  line: (label: string, value: string) => `**${label}:** ${value}`,
  user: (userId: string) => `<@${userId}> (\`${userId}\`)`,
  channel: (channelId: string) => `<#${channelId}>`,
  time: (date: Date) => `<t:${Math.floor(date.getTime() / 1000)}:F>`,
  code: (text: string) => `\`${text.replace(/`/g, "ˋ")}\``,
  jump: (url: string) => `[اضغط هنا](${url})`,
} as const;
