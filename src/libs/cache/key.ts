export function cacheKey(...parts: (string | number | undefined | null)[]): string {
  return parts.map((p) => (p === undefined || p === null ? "" : String(p))).join(":");
}
