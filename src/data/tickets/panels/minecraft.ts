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
    transferable: false,
  },

  close: {
    transcript: true,
    delete: true,
  },

  faq: { enabled: true },

  ticketMessage: {
    accentColor: colors.warning,
    text: [
      "اهلا بك في الدعم الفني المخصصة بماينكرافت، فريق الدعم الفني جاهز لمساعدتك في حل مشاكلك.",
      "الرجاء توضيح مشكلتك اكثر قدر ممكن، وكن صبورًا أثناء انتظار الرد.",
    ],
  },
};
