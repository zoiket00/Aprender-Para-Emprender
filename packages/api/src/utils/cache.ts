export class TtlCache<K, V> {
  private store = new Map<K, { v: V; exp: number }>();

  constructor(private ttlMs: number) {}

  get(key: K): V | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.exp) {
      this.store.delete(key);
      return undefined;
    }
    return e.v;
  }

  set(key: K, value: V): void {
    this.store.set(key, { v: value, exp: Date.now() + this.ttlMs });
  }

  del(key: K): void {
    this.store.delete(key);
  }
}
