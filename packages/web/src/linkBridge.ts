import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  KeyOfOrString,
  Parser,
  ParserSchema,
} from "@webview-bridge/types";
import {
  createRandomId,
  createResolver,
  noop,
  timeout,
} from "@webview-bridge/util";

import { MethodNotFoundError, NativeMethodError } from "./error";
import { emitter } from "./internal/emitter";
import { linkBridgeStore } from "./internal/linkBridgeStore";
import { LinkBridge } from "./types";

export interface LinkBridgeOptions<
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any>,
> {
  timeout?: number;
  throwOnError?: boolean | (keyof ExtractStore<T>)[] | string[];
  onFallback?: (methodName: string, args: unknown[]) => void;
  onReady?: (
    method: LinkBridge<
      ExcludePrimitive<ExtractStore<T>>,
      Omit<T, "setState">,
      V
    >,
  ) => void;
}

const createNativeMethod =
  ({
    methodName,
    throwOnError,
    timeoutMs,
    onFallback,
  }: {
    methodName: string;
    timeoutMs: number;
    throwOnError: boolean;
    onFallback?: (methodName: string, args: unknown[]) => void;
  }) =>
  (...args: unknown[]) => {
    const eventId = createRandomId();

    return Promise.race(
      [
        createResolver({
          emitter,
          methodName,
          eventId,
          evaluate: () => {
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
          onFallback: () => {
            onFallback?.(methodName, args);
          },
          failHandler: throwOnError && new NativeMethodError(methodName),
        }),
        timeoutMs > 0 && timeout(timeoutMs, throwOnError),
      ].filter(Boolean),
    );
  };

export const linkBridge = <
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any> = ParserSchema<any>,
>(
  options: LinkBridgeOptions<T, V> = {
    timeout: 2000,
    throwOnError: false,
  },
): LinkBridge<ExcludePrimitive<ExtractStore<T>>, Omit<T, "setState">, V> => {
  if (typeof window === "undefined") {
    return {
      store: {
        getState: () => ({}) as ExcludePrimitive<ExtractStore<T>>,
        subscribe: noop,
      } as unknown as Omit<T, "setState">,
    } as LinkBridge<ExcludePrimitive<ExtractStore<T>>, Omit<T, "setState">, V>;
  }

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
      (Array.isArray(throwOnError) && throwOnError.includes(methodName))
    );
  };

  const target = bridgeMethods.reduce(
    (acc, methodName) => {
      return {
        ...acc,
        [methodName]: createNativeMethod({
          methodName,
          timeoutMs,
          throwOnError: willMethodThrowOnError(methodName),
          onFallback,
        }),
      };
    },
    {} as LinkBridge<ExtractStore<T>, Omit<T, "setState">, V>,
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
      return createNativeMethod({
        methodName,
        timeoutMs,
        throwOnError: willMethodThrowOnError(methodName),
        onFallback,
      });
    },
  });

  Object.assign(target, {
    loose,
    store: linkBridgeStore<T>(target),
    isWebViewBridgeAvailable:
      Boolean(window.ReactNativeWebView) && bridgeMethods.length > 0,
    isNativeMethodAvailable(methodName: string) {
      return (
        typeof methodName === "string" &&
        Boolean(window.ReactNativeWebView) &&
        bridgeMethods.includes(methodName)
      );
    },
    addEventListener: <EventName extends KeyOfOrString<V>>(
      eventName: EventName,
      listener: (args: Parser<V, EventName>) => void,
    ) => {
      return emitter.on(`postMessage/${String(eventName)}`, listener);
    },
  });
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

      if (willMethodThrowOnError(methodName)) {
        return (...args: unknown[]) => {
          onFallback?.(methodName, args);
          Promise.reject(new MethodNotFoundError(methodName));
        };
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
