import { vacationConfig } from "./config.ts";

export const vacationPanel = {
  accentColor: vacationConfig.panelAccentColor,
  title: "## إجازات الستاف",
  body: [
    "تبي تاخذ وقت بعيد عن مهام الستاف؟ قدّم على إجازة عن طريق الزر تحت.",
    "مانجر ستاف راح يراجع طلبك. وطول ما إجازتك فعّالة رتب الستاف حقك محفوظة وترجع لك تلقائياً لمّا تخلص.",
  ],
  footer: "Robtic • إجازات الستاف",
  applyButton: "قدّم على إجازة",
} as const;
