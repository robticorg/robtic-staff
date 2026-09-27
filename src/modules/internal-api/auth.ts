import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isAuthorized(header: string | null, token: string | undefined): boolean {
  if (!token || !header) return false;
  const match = /^Bearer (.+)$/.exec(header.trim());
  if (!match?.[1]) return false;
  return timingSafeEqual(digest(match[1]), digest(token));
}
