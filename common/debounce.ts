export type AnyFunction = (...args: any[]) => any;
export type AnyAsyncFunction = (...args: any[]) => Promise<any>;

/**
 * Creates a debounced function that delays fn after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 */
export function debounce<T extends AnyFunction>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout = undefined;

  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = undefined;
      fn(...args);
    }, wait);
  };
}

export function debouncePromise<T extends AnyAsyncFunction>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => ReturnType<T> {
  let timeout: NodeJS.Timeout = undefined;
  let resolvers: PromiseWithResolvers<Awaited<ReturnType<T>>> | undefined
    = undefined;

  return (...args: Parameters<T>): ReturnType<T> => {
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
    }, wait);
    if (!resolvers) {
      resolvers = Promise.withResolvers<Awaited<ReturnType<T>>>();
    }
    return resolvers.promise as ReturnType<T>;
  };
}
