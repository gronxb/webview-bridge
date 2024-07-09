import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  ParserSchema,
  PrimitiveObject,
} from "@webview-bridge/types";
import { createEvents } from "@webview-bridge/util";

import { MethodNotFoundError } from "./error";
import { BridgeInstance } from "./internal/bridgeInstance";
import { mockStore } from "./internal/mockStore";
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

type HydrateEventPayload = {
  bridgeMethods: string[];
  nativeInitialState: PrimitiveObject;
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
      store: mockStore() as unknown as Omit<T, "setState">,
    } as LinkBridge<ExcludePrimitive<ExtractStore<T>>, Omit<T, "setState">, V>;
  }

  if (!window.ReactNativeWebView) {
    console.warn("[WebViewBridge] Not in a WebView environment");
  }

  const emitter = createEvents();
  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

  const bridgeMethods = window.__bridgeMethods__ ?? [];
  const nativeInitialState = window.__bridgeInitialState__ ?? {};

  const instance = new BridgeInstance(
    options,
    emitter,
    bridgeMethods,
    nativeInitialState,
  );

  if (bridgeMethods.length === 0) {
    const unsubscribe = emitter.on(
      "hydrate",
      ({ bridgeMethods, nativeInitialState }: HydrateEventPayload) => {
        instance._hydrate(bridgeMethods, nativeInitialState);
        unsubscribe();
      },
    );
  }

  const { onFallback, onReady } = options;

  const proxy = new Proxy(instance, {
    get: (target: any, methodName: string, proxy) => {
      if (methodName in target) {
        return target[methodName];
      }

      proxy._postMessage("fallback", {
        method: methodName,
      });

      if (proxy._willMethodThrowOnError(methodName)) {
        return (...args: unknown[]) => {
          onFallback?.(methodName, args);
          return Promise.reject(new MethodNotFoundError(methodName));
        };
      } else {
        console.warn(
          `[WebViewBridge] ${methodName} is not defined, using fallback.`,
        );
      }
      return () => Promise.resolve();
    },
  }) as LinkBridge<ExcludePrimitive<ExtractStore<T>>, Omit<T, "setState">, V>;

  onReady?.(proxy);
  return proxy;
};
