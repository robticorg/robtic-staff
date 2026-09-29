import type { TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const minecraftPanel: TicketPanelConfig = {
  id: "minecraft-support",
  name: "دعـم مـايـنكـرافـت",
  description: "مشكلة متعلقة في خادم ماينكرافت فك ذا تكت و بيجيك دعم",
  emoji: "<a:minecraft:1549743494833377350>",

  supportRoleId: "1538209900919005204",
  categoryId: "1536249080924348447",
  logChannelId: "1536249123265581056",

  questions: {
    enabled: true,
    items: [
      {
        id: "user",
        label: "ما هو اسم المستخدم؟",
        placeholder: "اكتب اسم المستخدم هنا",
        style: "SHORT",
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      {
        id: "problem",
        label: "ما هي المشكلة؟",
        placeholder: "اشرح مشكلتك بالتفصيل…",
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
    text: [
      "أهلًا بك في دعم Minecraft، فريق الدعم جاهز لمساعدتك في حل مشكلتك.",
      "يرجى توضيح المشكلة بالتفصيل قدر الإمكان، والتحلي بالصبر أثناء انتظار الرد.",
      "",
      "Welcome to Minecraft Support. Our support team is ready to help you resolve your issue.",
      "Please describe your issue in as much detail as possible and be patient while waiting for a response.",
    ],
  },
};
