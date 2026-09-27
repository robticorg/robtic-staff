const MONTH_DAYS = 30;
const YEAR_DAYS = 365;

function countLabel(n: number, [one, two, few, many]: [string, string, string, string]): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function formatElapsedDays(days: number): string {
  const safe = Math.max(0, Math.floor(days));
  if (safe < MONTH_DAYS) {
    return safe === 0 ? "أقل من يوم" : countLabel(safe, ["يوم", "يومين", "أيام", "يوم"]);
  }
  const years = Math.floor(safe / YEAR_DAYS);
  const months = Math.floor((safe % YEAR_DAYS) / MONTH_DAYS);
  const monthText = countLabel(months, ["شهر", "شهرين", "أشهر", "شهر"]);
  if (years === 0) return monthText;
  const yearText = countLabel(years, ["سنة", "سنتين", "سنوات", "سنة"]);
  return months === 0 ? yearText : `${yearText} و ${monthText}`;
}
