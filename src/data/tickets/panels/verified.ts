import { UNSET_ID, type TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const verifiedPanel: TicketPanelConfig = {
  id: "verified-girls",
  name: "تـوثـيـق بـنـات",
  description: "اذا انتي بنت و تريدين رتبة توثيق فقط فكي هذا تكت",
  emoji: "<:FL_7b:1486139849131032587>",

  supportRoleId: UNSET_ID,

  questions: {
    enabled: false,
    items: [],
  },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: true,
    onlyOnce: true,
    transferable: true,
  },

  close: {
    transcript: true,
    delete: false,
  },

  faq: { enabled: true },

  ticketMessage: {
    accentColor: colors.info,
    text: [
      "أهلًا بك في قسم التوثيق، يرجى الانتظار حتى تقوم الموثقة بمراجعة طلبك ومنحك رتبة التوثيق.",
      "يرجى التحلي بالصبر وعدم إزعاج الموثقة أو المسؤولين، وسيتم الرد عليك في أقرب وقت.",
      "",
      "Welcome to the Verification Department. Please wait while our verifier reviews your request and grants you the verification role.",
      "Please be patient and avoid repeatedly contacting the verifier or staff. You will receive a response as soon as possible.",
    ],
  },
};
