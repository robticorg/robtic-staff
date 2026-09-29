import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Counts wrong-token attempts per IP. Once an IP hits the limit it is refused
 * (even with the right token) until its window runs out — so a publicly bound
 * API can't be brute-forced.
 */
export class FailedAuthLimiter {
  private readonly failures = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  isBlocked(ip: string, now = Date.now()): boolean {
    const entry = this.failures.get(ip);
    if (!entry) return false;
    if (entry.resetAt <= now) {
      this.failures.delete(ip);
      return false;
    }
    return entry.count >= this.max;
  }

  recordFailure(ip: string, now = Date.now()): void {
    const entry = this.failures.get(ip);
    if (!entry || entry.resetAt <= now) {
      this.failures.set(ip, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
    // Keep memory bounded if many IPs probe the port.
    if (this.failures.size > 10_000) {
      for (const [key, value] of this.failures) if (value.resetAt <= now) this.failures.delete(key);
    }
  }
}

export function isAuthorized(header: string | null, token: string | undefined): boolean {
  if (!token || !header) return false;
  const match = /^Bearer (.+)$/.exec(header.trim());
  if (!match?.[1]) return false;
  return timingSafeEqual(digest(match[1]), digest(token));
}
