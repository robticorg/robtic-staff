import { L, currentLang } from "../../../shared/utils/lang-context.ts";
import { UNSET_ID, type TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const minecraftPanel: TicketPanelConfig = {
  id: "minecraft-support",
  ticketPrefix: "minecraft",
  get name() { return L("Minecraft support", "دعـم مـايـنكـرافـت"); },
  get description() { return L("A problem on the Minecraft server? Open this ticket.", "مشكلة متعلقة في خادم ماينكرافت فك ذا تكت و بيجيك دعم"); },
  emoji: "<a:minecraft:1549743494833377350>",

  supportRoleId: UNSET_ID,

  questions: {
    enabled: true,
    items: [
      {
        id: "user",
        get label() { return L("What's your username?", "ما هو اسم المستخدم؟"); },
        get placeholder() { return L("Your username", "اكتب اسم المستخدم هنا"); },
        style: "SHORT",
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      {
        id: "problem",
        get label() { return L("What's the problem?", "ما هي المشكلة؟"); },
        get placeholder() { return L("Describe the problem in detail…", "اشرح مشكلتك بالتفصيل…"); },
        style: "PARAGRAPH",
        required: true,
        minLength: 3,
        maxLength: 300,
      },
    ],
  },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: true,
    onlyOnce: true,
    transferable: true,
  },

  close: {
    transcript: true,
    delete: true,
  },

  faq: { enabled: true },

  ticketMessage: {
    accentColor: colors.warning,
    get text() { return currentLang() === "en" ? ["Welcome to Minecraft support. Describe your problem in detail; the team will be with you shortly."] : ["أهلاً بك في دعم ماينكرافت. اشرح مشكلتك بالتفصيل، وبيوصلك الفريق قريب."]; },
  },
};
