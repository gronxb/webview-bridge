import {
  createEvents,
  createRandomId,
  createResolver,
  timeout,
} from "@webview-bridge/util";

import { MethodNotFoundError, NativeMethodError } from "./error";
import { Bridge, WithAvailable } from "./types";

const emitter = createEvents();

export interface LinkNativeMethodOptions<BridgeObject extends Bridge> {
  timeout?: number;
  throwOnError?: boolean | (keyof BridgeObject)[];
  onFallback?: (method: keyof BridgeObject) => void;
}

export const linkNativeMethod = <BridgeObject extends Bridge>(
  options: LinkNativeMethodOptions<BridgeObject> = {
    timeout: 2000,
    throwOnError: false,
  },
): WithAvailable<BridgeObject> => {
  const {
    timeout: timeoutMs = 2000,
    throwOnError = false,
    onFallback,
  } = options;

  if (!window.ReactNativeWebView) {
    console.warn("[WebViewBridge] Not in a WebView environment");
  }

  const bridgeMethods = window.__bridgeMethods__ ?? [];

  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

  const isMethodAvailable = (methodName: string) => {
    return (
      throwOnError === true ||
      (Array.isArray(throwOnError) &&
        throwOnError.includes(methodName as keyof BridgeObject))
    );
  };

  const target = bridgeMethods.reduce(
    (acc, method) => {
      return {
        ...acc,
        [method]: (...args: unknown[]) => {
          const eventId = createRandomId();

          return Promise.race([
            createResolver(
              emitter,
              method,
              eventId,
              () => {
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
              },
              isMethodAvailable(method) && new NativeMethodError(method),
            ),
            timeout(timeoutMs),
          ]);
        },
      };
    },
    {
      isWebViewBridgeAvailable:
        Boolean(window.ReactNativeWebView) && bridgeMethods.length > 0,
      isNativeMethodAvailable(method) {
        return (
          typeof method === "string" &&
          Boolean(window.ReactNativeWebView) &&
          bridgeMethods.includes(method)
        );
      },
    } as WithAvailable<BridgeObject>,
  );

  return new Proxy(target, {
    get: (target, method: string) => {
      if (method in target) {
        return (target as { [key: string]: () => Promise<string> })[method];
      }
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: "fallback",
          body: {
            method,
          },
        }),
      );
      onFallback?.(method as keyof BridgeObject);

      if (isMethodAvailable(method)) {
        return () => Promise.reject(new MethodNotFoundError(method));
      } else {
        console.warn(
          `[WebViewBridge] ${method} is not defined, using fallback.`,
        );
      }
      return () => Promise.resolve();
    },
  });
};
