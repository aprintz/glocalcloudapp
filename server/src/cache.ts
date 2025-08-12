type Entry<T> = { value: T; expiresAt: number };

export class TTLCache<T = any> {
  private store = new Map<string, Entry<T>>();
  constructor(private defaultTtlMs = 30000) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: T, ttlMs?: number) {
    const t = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, { value, expiresAt: Date.now() + t });
  }

  clear() { this.store.clear(); }
}
