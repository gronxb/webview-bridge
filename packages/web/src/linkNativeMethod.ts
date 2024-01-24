import {
  createEvents,
  createRandomId,
  createResolver,
  timeout,
} from "@webview-bridge/util";

import { MethodNotFoundError, NativeMethodError } from "./error";
import { MethodBridge, NativeMethod } from "./types";

const emitter = createEvents();

export interface LinkNativeMethodOptions<
  BridgeObject extends MethodBridge<BridgeObject>,
> {
  timeout?: number;
  throwOnError?: boolean | (keyof BridgeObject)[] | string[];
  onFallback?: (method: string) => void;
}

const createNativeMethod =
  (method: string, timeoutMs: number, throwOnError: boolean) =>
  (...args: unknown[]) => {
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
        throwOnError && new NativeMethodError(method),
      ),
      timeout(timeoutMs, throwOnError),
    ]);
  };

export const linkNativeMethod = <
  BridgeObject extends MethodBridge<BridgeObject>,
>(
  options: LinkNativeMethodOptions<BridgeObject> = {
    timeout: 2000,
    throwOnError: false,
  },
): NativeMethod<Omit<BridgeObject, "__signature">> => {
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

  const willMethodThrowOnError = (methodName: string) => {
    return (
      throwOnError === true ||
      (Array.isArray(throwOnError) &&
        throwOnError.includes(methodName as keyof BridgeObject & string))
    );
  };

  const target = bridgeMethods.reduce(
    (acc, method) => {
      return {
        ...acc,
        [method]: createNativeMethod(
          method,
          timeoutMs,
          willMethodThrowOnError(method),
        ),
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
    } as NativeMethod<BridgeObject>,
  );

  const loose = new Proxy(target, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (target: any, method: string) => {
      if (
        method in target &&
        !["isWebViewBridgeAvailable", "isNativeMethodAvailable"].includes(
          method,
        )
      ) {
        return target[method];
      }
      return createNativeMethod(
        method,
        timeoutMs,
        willMethodThrowOnError(method),
      );
    },
  });

  Object.assign(target, { loose });
  return new Proxy(target, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (target: any, method: string) => {
      if (method in target) {
        return target[method];
      }

      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: "fallback",
          body: {
            method,
          },
        }),
      );
      onFallback?.(method);

      if (willMethodThrowOnError(method)) {
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
