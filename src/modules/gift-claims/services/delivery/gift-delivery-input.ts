import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";

const DIGITS = /^\d+$/;

function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function parseCreditAmount(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = toAsciiDigits(raw.trim()).replace(/[,،_\s]/g, "");
  if (!DIGITS.test(compact)) return null;
  const normalized = compact.replace(/^0+/, "");
  if (!normalized || normalized.length > giftClaimConfig.delivery.maxAmountDigits) return null;
  return normalized;
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
