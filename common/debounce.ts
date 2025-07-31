export type AnyFunction = (...args: any[]) => any;
export type AnyAsyncFunction = (...args: any[]) => Promise<any>;

export type Debounced<T extends AnyAsyncFunction>
  = (...args: Parameters<T>) => ReturnType<T>;

export interface Wait {
  wait: number;
}

export type DebouncedWait<T extends AnyAsyncFunction> = Debounced<T> & Wait;

/**
 * Creates a debounced function that delays fn after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 */
export function debouncePromise<T extends AnyAsyncFunction>(
  fn: T,
  wait: number
): DebouncedWait<T> {
  let timeout: NodeJS.Timeout = undefined;
  let resolvers: PromiseWithResolvers<Awaited<ReturnType<T>>> | undefined
    = undefined;

  function wrapper(...args: Parameters<T>): ReturnType<T> {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(async () => {
      const r = resolvers;
      resolvers = undefined;
      timeout = undefined;
      try {
        const result = await fn(...args);
        r.resolve(result);
      } catch (e) {
        r.reject(e);
      }
    }, wrapper.wait);
    if (!resolvers) {
      resolvers = Promise.withResolvers<Awaited<ReturnType<T>>>();
    }
    return resolvers.promise as ReturnType<T>;
  }
  wrapper.wait = wait;
  return wrapper;
}
