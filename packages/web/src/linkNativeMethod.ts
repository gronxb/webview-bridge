import {
  createEvents,
  createRandomId,
  createResolver,
  timeout,
} from "@rnbridge/util";

import { MethodNotFoundError } from "./error";

const emitter = createEvents();

export interface LinkNativeMethodOptions<T extends object> {
  timeout?: number;
  throwOnError?: boolean;
  onFallback?: (method: keyof T) => void;
}

export const linkNativeMethod = <T extends object>(
  options: LinkNativeMethodOptions<T> = {
    timeout: 2000,
    throwOnError: false,
  },
) => {
  const {
    timeout: timeoutMs = 2000,
    throwOnError = false,
    onFallback,
  } = options;

  if (!window.ReactNativeWebView) {
    console.warn("[RNBridge] Not in a WebView environment");
  }

  const bridgeMethods = window.__bridgeMethods__ ?? [];

  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

  const target = bridgeMethods.reduce((acc, method) => {
    return {
      ...acc,
      [method]: (...args: unknown[]) => {
        const eventId = createRandomId();

        return Promise.race([
          createResolver(emitter, method, eventId, () => {
            window.ReactNativeWebView?.postMessage(
              JSON.stringify({
                type: "bridge",
                body: {
                  method,
                  eventId,
                  args,
                },
              }),
            );
          }),
          timeout(timeoutMs),
        ]);
      },
    };
  }, {} as T);

  return new Proxy(target, {
    get: (target, method: string) => {
      if (method in target) {
        return (target as { [key: string]: () => string })[method];
      }
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: "fallback",
          body: {
            method,
          },
        }),
      );
      onFallback?.(method as keyof T);

      if (throwOnError) {
        return () => Promise.reject(new MethodNotFoundError(method));
      } else {
        console.warn(`[RNBridge] ${method} is not defined, using fallback.`);
      }
      return () => Promise.resolve();
    },
  });
};
