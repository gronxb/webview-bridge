/**
 * Run a user callback (e.g. `onFallback`) so that an exception it throws is
 * logged instead of changing the outcome of the bridge call that triggered it.
 */
export const invokeCallback = <Args extends unknown[]>(
  name: string,
  callback: ((...args: Args) => unknown) | undefined,
  ...args: Args
) => {
  if (!callback) {
    return;
  }
  try {
    callback(...args);
  } catch (error) {
    console.error(`[WebViewBridge] \`${name}\` threw:`, error);
  }
};
