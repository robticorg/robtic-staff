import { describe, expect, test } from "bun:test";
import { TtlCache, cacheKey } from "../index.ts";

describe("cacheKey", () => {
  test("joins parts with a colon", () => {
    expect(cacheKey("guild", 42, "reports")).toBe("guild:42:reports");
  });

  test("renders undefined and null as empty segments", () => {
    expect(cacheKey("a", undefined, null, "b")).toBe("a:::b");
  });
});

describe("TtlCache", () => {
  test("stores and retrieves values", () => {
    const cache = new TtlCache<number>({ defaultTtlMs: 1000 });
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.has("a")).toBe(true);
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.has("missing")).toBe(false);
  });

  test("expires entries after their ttl", async () => {
    const cache = new TtlCache<string>({ defaultTtlMs: 5 });
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
    await Bun.sleep(15);
    expect(cache.get("k")).toBeUndefined();
  });

  test("delete removes a single entry", () => {
    const cache = new TtlCache<number>({ defaultTtlMs: 1000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });

  test("deleteByPrefix removes every matching key", () => {
    const cache = new TtlCache<number>({ defaultTtlMs: 1000 });
    cache.set("guild:1:reports", 1);
    cache.set("guild:1:tickets", 2);
    cache.set("guild:2:reports", 3);
    cache.deleteByPrefix("guild:1:");
    expect(cache.get("guild:1:reports")).toBeUndefined();
    expect(cache.get("guild:1:tickets")).toBeUndefined();
    expect(cache.get("guild:2:reports")).toBe(3);
  });

  test("clear empties the cache", () => {
    const cache = new TtlCache<number>({ defaultTtlMs: 1000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  test("getOrSet loads once then serves from cache", async () => {
    const cache = new TtlCache<number>({ defaultTtlMs: 1000 });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return 7;
    };
    expect(await cache.getOrSet("k", loader)).toBe(7);
    expect(await cache.getOrSet("k", loader)).toBe(7);
    expect(calls).toBe(1);
  });

  test("getOrSet caches null results", async () => {
    const cache = new TtlCache<number | null>({ defaultTtlMs: 1000 });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return null;
    };
    expect(await cache.getOrSet("k", loader)).toBeNull();
    expect(await cache.getOrSet("k", loader)).toBeNull();
    expect(calls).toBe(1);
  });

  test("getOrSet reloads after invalidation", async () => {
    const cache = new TtlCache<number>({ defaultTtlMs: 1000 });
    let value = 1;
    const loader = async () => value;
    expect(await cache.getOrSet("k", loader)).toBe(1);
    value = 2;
    cache.delete("k");
    expect(await cache.getOrSet("k", loader)).toBe(2);
  });
});
