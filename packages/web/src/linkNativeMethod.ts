import {
  createEvents,
  createRandomId,
  createResolver,
  timeout,
} from "@webview-bridge/util";

import { MethodNotFoundError, NativeMethodError } from "./error";
import { Bridge, NativeMethod } from "./types";

const emitter = createEvents();

export interface LinkNativeMethodOptions<BridgeObject extends Bridge> {
  timeout?: number;
  throwOnError?: boolean | (keyof BridgeObject)[] | string[];
  onFallback?: (methodName: string) => void;
  onReady?: (method: NativeMethod<BridgeObject>) => void;
}

const createNativeMethod =
  (methodName: string, timeoutMs: number, throwOnError: boolean) =>
  (...args: unknown[]) => {
    const eventId = createRandomId();

    return Promise.race([
      createResolver(
        emitter,
        methodName,
        eventId,
        () => {
          window.ReactNativeWebView?.postMessage(
            JSON.stringify({
              type: "bridge",
              body: {
                method: methodName,
                eventId,
                args,
              },
            }),
          );
        },
        throwOnError && new NativeMethodError(methodName),
      ),
      timeout(timeoutMs, throwOnError),
    ]);
  };

export const linkNativeMethod = <BridgeObject extends Bridge>(
  options: LinkNativeMethodOptions<BridgeObject> = {
    timeout: 2000,
    throwOnError: false,
  },
): NativeMethod<BridgeObject> => {
  const {
    timeout: timeoutMs = 2000,
    throwOnError = false,
    onFallback,
    onReady,
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
        throwOnError.includes(methodName as keyof BridgeObject))
    );
  };

  const target = bridgeMethods.reduce(
    (acc, methodName) => {
      return {
        ...acc,
        [methodName]: createNativeMethod(
          methodName,
          timeoutMs,
          willMethodThrowOnError(methodName),
        ),
      };
    },
    {
      isWebViewBridgeAvailable:
        Boolean(window.ReactNativeWebView) && bridgeMethods.length > 0,
      isNativeMethodAvailable(methodName) {
        return (
          typeof methodName === "string" &&
          Boolean(window.ReactNativeWebView) &&
          bridgeMethods.includes(methodName)
        );
      },
    } as NativeMethod<BridgeObject>,
  );

  const loose = new Proxy(target, {
    get: (target, methodName: string) => {
      if (
        methodName in target &&
        !["isWebViewBridgeAvailable", "isNativeMethodAvailable"].includes(
          methodName,
        )
      ) {
        return target[methodName];
      }
      return createNativeMethod(
        methodName,
        timeoutMs,
        willMethodThrowOnError(methodName),
      );
    },
  });

  Object.assign(target, { loose });
  const proxy = new Proxy(target, {
    get: (target, methodName: string) => {
      if (methodName in target) {
        return target[methodName];
      }

      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: "fallback",
          body: {
            method: methodName,
          },
        }),
      );
      onFallback?.(methodName);

      if (willMethodThrowOnError(methodName)) {
        return () => Promise.reject(new MethodNotFoundError(methodName));
      } else {
        console.warn(
          `[WebViewBridge] ${methodName} is not defined, using fallback.`,
        );
      }
      return () => Promise.resolve();
    },
  });

  onReady?.(proxy);
  return proxy;
};
