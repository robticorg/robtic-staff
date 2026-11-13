import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

const shared = {
  line: (label: string, value: string) => `**${label}:** ${value}`,
  user: (userId: string) => `<@${userId}> (\`${userId}\`)`,
  channel: (channelId: string) => `<#${channelId}>`,
  time: (date: Date) => `<t:${Math.floor(date.getTime() / 1000)}:F>`,
  code: (text: string) => `\`${text.replace(/`/g, "ˋ")}\``,
};

export const commandLogMessages = bilingual(
  {
    headings: {
      SUCCESS: `${E.success} **Command run**`,
      DENIED: `${E.warning} **Command denied**`,
      ERROR: `${E.error} **Command failed**`,
    },
    labels: {
      command: "Command",
      actor: "By",
      channel: "Channel",
      targets: "Target",
      detail: "Reason",
      time: "Time",
      link: "Message",
    },
    ...shared,
    jump: (url: string) => `[Jump](${url})`,
  },
  {
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
    ...shared,
    jump: (url: string) => `[اضغط هنا](${url})`,
  },
);
