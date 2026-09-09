interface Entry<V> {
  value: V;
  expiresAt: number;
}

export interface TtlCacheOptions {
  defaultTtlMs: number;
}

export class TtlCache<V> {
  private readonly store = new Map<string, Entry<V>>();
  private readonly defaultTtlMs: number;

  constructor(options: TtlCacheOptions) {
    this.defaultTtlMs = options.defaultTtlMs;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  set(key: string, value: V, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  async getOrSet(
    key: string,
    loader: () => Promise<V>,
    ttlMs: number = this.defaultTtlMs,
  ): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    this.set(key, value, ttlMs);
    return value;
  }
}
