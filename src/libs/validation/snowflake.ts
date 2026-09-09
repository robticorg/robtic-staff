export const SNOWFLAKE_RE = /^\d{17,20}$/;
export const USER_MENTION_RE = /^<@!?(\d{17,20})>$/;
export const ROLE_MENTION_RE = /^<@&(\d{17,20})>$/;
export const CHANNEL_MENTION_RE = /^<#(\d{17,20})>$/;

export function isSnowflake(value: string): boolean {
  return SNOWFLAKE_RE.test(value.trim());
}

export function extractUserIds(args: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const arg of args) {
    const m = arg.match(USER_MENTION_RE);
    if (m) ids.add(m[1]!);
    else if (isSnowflake(arg) && !arg.match(ROLE_MENTION_RE)) ids.add(arg.trim());
  }
  return [...ids];
}

export function extractRoleIds(args: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const arg of args) {
    const m = arg.match(ROLE_MENTION_RE);
    if (m) ids.add(m[1]!);
  }
  return [...ids];
}

export function firstUserTarget(args: readonly string[]): string | null {
  for (const arg of args) {
    const m = arg.match(USER_MENTION_RE);
    if (m) return m[1]!;
  }
  for (const arg of args) {
    if (isSnowflake(arg)) return arg.trim();
  }
  return null;
}

export function parseCount(token: string | undefined): number | null {
  if (token === undefined) return null;
  if (!/^\d+$/.test(token)) return null;
  const n = Number(token);
  return Number.isSafeInteger(n) ? n : null;
}
