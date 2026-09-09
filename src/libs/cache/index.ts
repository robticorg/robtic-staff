export { TtlCache, type TtlCacheOptions } from "./ttl-cache.ts";
export { cacheKey } from "./key.ts";

export const CACHE_ENABLED = process.env.NODE_ENV !== "test";

export const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
