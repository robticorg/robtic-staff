import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";

const MULTIPLIERS: Readonly<Record<string, bigint>> = {
  k: 1_000n,
  "ك": 1_000n,
  "الف": 1_000n,
  "ألف": 1_000n,
  "آلاف": 1_000n,
  "الاف": 1_000n,
  "ألاف": 1_000n,
  m: 1_000_000n,
  "م": 1_000_000n,
  "مليون": 1_000_000n,
  "ملايين": 1_000_000n,
  b: 1_000_000_000n,
  "مليار": 1_000_000_000n,
  "مليارات": 1_000_000_000n,
};

const AMOUNT = /^(\d+(?:\.\d+)?)?([^\d.]*)$/;

function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".");
}

export function parseCreditAmount(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = toAsciiDigits(raw.trim().toLowerCase()).replace(/[,،_\s]/g, "");
  const match = AMOUNT.exec(compact);
  if (!match) return null;
  const [, number, unit = ""] = match;
  if (!number && !unit) return null;

  const multiplier = unit ? MULTIPLIERS[unit] : 1n;
  if (multiplier === undefined) return null;

  const [whole = "", fraction = ""] = (number ?? "1").split(".");
  const scale = 10n ** BigInt(fraction.length);
  const scaled = BigInt(whole + fraction) * multiplier;
  if (scaled % scale !== 0n) return null;
  const value = scaled / scale;
  if (value <= 0n) return null;

  const normalized = value.toString();
  if (normalized.length > giftClaimConfig.delivery.maxAmountDigits) return null;
  return normalized;
}

export function extractCreditAmount(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const whole = parseCreditAmount(raw);
  if (whole) return whole;
  const tokens = raw.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const pair = tokens[i + 1] ? parseCreditAmount(`${tokens[i]}${tokens[i + 1]}`) : null;
    if (pair && /\d/.test(toAsciiDigits(tokens[i]!))) return pair;
    if (/\d/.test(toAsciiDigits(tokens[i]!))) {
      const single = parseCreditAmount(tokens[i]);
      if (single) return single;
    }
  }
  return null;
}

export function parseGiftLink(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value || value.length > giftClaimConfig.delivery.maxLinkLength || /\s/.test(value)) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
  return url.toString();
}

export function cleanAdditionalInfo(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  return value ? value.slice(0, 1000) : null;
}
