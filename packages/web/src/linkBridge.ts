import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  ParserSchema,
  PrimitiveObject,
} from "@webview-bridge/types";
import { createEvents, noop } from "@webview-bridge/util";

import { BridgeInstance } from "./internal/bridgeInstance";
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
      store: {
        getState: () => ({}) as ExcludePrimitive<ExtractStore<T>>,
        subscribe: noop,
      } as unknown as Omit<T, "setState">,
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
        alert("hydrating");
        instance.hydrate(bridgeMethods, nativeInitialState);
        unsubscribe();
      },
    );
  }
  return instance.proxy; // to only expose instance;
};
