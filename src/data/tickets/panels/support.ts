import { L, currentLang } from "../../../shared/utils/lang-context.ts";
import { UNSET_ID, type TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const supportPanel: TicketPanelConfig = {
  id: "support",
  ticketPrefix: "ticket",
  get name() { return L("Technical support", "الـدعـم الـفـنـي"); },
  get description() { return L("Get help from the technical support team.", "تواصل مع فريق الدعم الفني لحل مشاكل الخاصة بك."); },
  emoji: "<a:736257973906571306:1485939519642537994>",

  supportRoleId: UNSET_ID,

  questions: {
    enabled: true,
    items: [
      {
        id: "problem",
        get label() { return L("What's the problem?", "ما هي المشكلة؟"); },
        get placeholder() { return L("Describe the problem in detail…", "اشرح مشكلتك بالتفصيل…"); },
        style: "PARAGRAPH",
        required: true,
        minLength: 3,
        maxLength: 200,
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
    get text() { return currentLang() === "en" ? ["Welcome to technical support. Describe your problem; never share passwords, 2FA codes or payment details here."] : ["أهلاً بك في الدعم الفني. اشرح مشكلتك، ولا تشارك كلمات المرور أو أكواد التحقق أو بيانات الدفع هنا."]; },
  },
};
