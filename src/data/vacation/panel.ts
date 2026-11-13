import { vacationConfig } from "./config.ts";
import { L, currentLang } from "../../shared/utils/lang-context.ts";

export const vacationPanel = {
  accentColor: vacationConfig.panelAccentColor,
  get title() { return L("## Staff vacations", "## إجازات الطاقم"); },
  get body() {
    return currentLang() === "en"
      ? ["Need time away from staff duties? Request a vacation with the button below.", "A staff manager reviews it; your staff roles are kept and come back when it ends."]
      : ["تحتاج وقت بعيد عن مهام الطاقم؟ قدّم على إجازة من الزر تحت.", "يراجعها مانجر الطاقم، ورتبك محفوظة وترجع لك إذا خلصت."];
  },
  get footer() { return L("Robtic • Staff vacations", "Robtic • إجازات الطاقم"); },
  get applyButton() { return L("Request vacation", "قدّم على إجازة"); },
};
