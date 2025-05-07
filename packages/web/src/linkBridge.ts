import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  ParserSchema,
  PrimitiveObject,
} from "@webview-bridge/types";
import { createEvents, createRandomId } from "@webview-bridge/utils";

import { MethodNotFoundError } from "./error";
import { BridgeInstance } from "./internal/bridgeInstance";
import { mockStore } from "./internal/mockStore";
import type { LinkBridge } from "./types";

export interface LinkBridgeOptions<
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any>,
> {
  /**
   * If `true`, console warnings will be displayed.
   * @default false
   */
  debug?: boolean;
  /**
   * It is possible to configure `initialBridge` to operate in a non-React Native environment.
   * Prioritize applying the bridge of the React Native WebView, and if it is unavailable, apply the `initialBridge`.
   * Therefore, if `initialBridge` is configured, `bridge.isWebViewBridgeAvailable` should be true even in environments that are not React Native.
   * @link https://gronxb.github.io/webview-bridge/non-react-native-environment.html
   */
  initialBridge?: Partial<ExtractStore<T>>;
  /**
   * Set the timeout in milliseconds after calling the native method.
   * @default 2000
   */
  timeout?: number;
  /**
   * If `true`, an error will be thrown when calling a method that is not defined in the bridge.
   */
  throwOnError?: boolean | (keyof ExtractStore<T>)[] | string[];
  /**
   * Callback function when a method that is not defined in the bridge is called.
   */
  onFallback?: (methodName: string, args: unknown[]) => void;
  /**
   * Callback function when the bridge is ready.
   */
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

/**
 * Create a link to the bridge connected to the React Native WebView.
 * @link https://gronxb.github.io/webview-bridge/getting-started.html
 */
export const linkBridge = <
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any> = ParserSchema<any>,
>(
  options: LinkBridgeOptions<T, V> = {
    timeout: 2000,
    throwOnError: false,
    debug: false,
  },
): LinkBridge<ExcludePrimitive<ExtractStore<T>>, Omit<T, "setState">, V> => {
  if (typeof window === "undefined") {
    const initialBridge = options?.initialBridge ?? {};
    const initialMethods = Object.entries(initialBridge).filter(
      ([_, bridge]) => typeof bridge === "function",
    );
    const initialBridgeMethodNames = initialMethods.map(
      ([methodName]) => methodName,
    );
    return {
      addEventListener:
        (_eventName: string, _listener: (...args: any[]) => void) => () => {},
      loose: {},
      isWebViewBridgeAvailable: initialBridgeMethodNames.length > 0,
      isNativeMethodAvailable: (method: string) =>
        initialBridgeMethodNames.includes(method),
      store: mockStore(options?.initialBridge) as unknown as Omit<
        T,
        "setState"
      >,
    } as LinkBridge<ExcludePrimitive<ExtractStore<T>>, Omit<T, "setState">, V>;
  }

  if (options.debug && !window.ReactNativeWebView) {
    console.warn("[WebViewBridge] Not in a WebView environment");
  }

  const bridgeId = createRandomId();
  const emitter = createEvents();

  window.nativeEmitterMap = {
    ...(window.nativeEmitterMap || {}),
    [bridgeId]: emitter,
  };

  /**
   * @deprecated This version is not used after 1.7.2
   */
  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

  const bridgeMethods = window.__bridgeMethods__ ?? [];
  const nativeInitialState = window.__bridgeInitialState__ ?? {};

  const instance = new BridgeInstance(
    bridgeId,
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
      }

      if (options.debug) {
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
