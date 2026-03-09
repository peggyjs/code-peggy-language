type Notification<K, V> = (key: K, value: V | null) => void;

// Light pub-sub over a map
export class WatchMap<K, V> extends Map<K, V | null> {
  #pending = new Map<K, Notification<K, V>[]>();

  public set(key: K, value: V | null): this {
    super.set(key, value);
    return this.#notify(key, value);
  }

  public delete(key: K): boolean {
    this.#notify(key, null);
    return super.delete(key);
  }

  public waitFor(key: K): Promise<V | null> {
    return new Promise(resolve => {
      if (this.has(key)) {
        resolve(this.get(key) as V);
      } else {
        this.#watch(key, (_k, v) => {
          resolve(v);
        });
      }
    });
  }

  #notify(key: K, value: V | null): this {
    const watchers = this.#pending.get(key);
    if (watchers) {
      this.#pending.delete(key);
      for (const w of watchers) {
        w.call(this, key, value);
      }
    }
    return this;
  }

  #watch(key: K, cb: Notification<K, V>): this {
    let watchers = this.#pending.get(key);
    if (!watchers) {
      watchers = [];
      this.#pending.set(key, watchers);
    }
    watchers.push(cb);
    return this;
  }
}
