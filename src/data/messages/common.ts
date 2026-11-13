import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

export const commonMessages = bilingual(
  {
    prefix: { success: emojis.success, error: emojis.error },
    errors: {
      commandCrashed: `${emojis.error} Something went wrong running the command. The team was told.`,
      componentCrashed: `${emojis.error} Something went wrong. Try again.`,
      guildOnly: "This command works in a server only.",
      guildOnlyAction: "This works in a server only.",
      needAdministrator: "You need the **Administrator** permission for this.",
      membershipUnverified: "Couldn't confirm you're a member of the server.",
      commandNotCompleted: "The command wasn't completed",
      unknownSubcommand: (sub: string) => `Unknown subcommand: \`${sub}\``,
    },
  },
  {
    prefix: { success: emojis.success, error: emojis.error },
    errors: {
      commandCrashed: `${emojis.error} صار خطأ أثناء تنفيذ الأمر. تم إبلاغ الفريق.`,
      componentCrashed: `${emojis.error} صار خطأ، جرّب مرة ثانية.`,
      guildOnly: "الأمر داخل السيرفر بس.",
      guildOnlyAction: "داخل السيرفر بس.",
      needAdministrator: "تحتاج صلاحية **Administrator**.",
      membershipUnverified: "ما قدرت أتأكد إنك عضو في السيرفر.",
      commandNotCompleted: "ما تم تنفيذ الأمر",
      unknownSubcommand: (sub: string) => `أمر فرعي غير معروف: \`${sub}\``,
    },
  },
);
