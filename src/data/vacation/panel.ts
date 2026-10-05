import { vacationConfig } from "./config.ts";

export const vacationPanel = {
  accentColor: vacationConfig.panelAccentColor,
  title: "## إجازات الطاقم الاداري",
  body: [
    "تبي تاخذ وقت بعيد عن مهام الطاقم الاداري؟ قدّم على إجازة عن طريق الزر تحت.",
    "مانجر الطاقم الاداري راح يراجع طلبك. وطول ما إجازتك فعّالة رتب الطاقم الاداري حقك محفوظة وترجع لك تلقائياً لمّا تخلص.",
  ],
  footer: "Robtic • إجازات الطاقم الاداري",
  applyButton: "قدّم على إجازة",
} as const;
