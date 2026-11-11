import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  ParserSchema,
  PrimitiveObject,
  UndelegatedBridge,
} from "@webview-bridge/types";
import {
  createEvents,
  createRandomId,
  invokeCallback,
} from "@webview-bridge/utils";

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
  initialBridge?: Partial<UndelegatedBridge<ExtractStore<T>>>;
  /**
   * How long, in milliseconds, to wait for native to acknowledge a native
   * method call. Once native acknowledges it, the call waits for the method's
   * result with no time limit, so methods that wait for the user are not cut off.
   *
   * Native builds older than the acknowledgement apply this limit to the whole
   * call. When it runs out, the call resolves to `undefined`, or rejects with
   * `Error("Timeout")` if `throwOnError` applies. `0` disables it.
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

/**
 * Native answers a call to a method it does not have with a bare `true`
 * error (`handleBridge` → `handleThrow()` without an Error).
 */
const isMethodNotFoundResponse = (error: unknown) => error === true;

type HydrateEventPayload = {
  bridgeMethods: string[];
  nativeInitialState?: PrimitiveObject;
  /**
   * Sent by `@webview-bridge/react-native` <= 1.8.0 instead of
   * `nativeInitialState`.
   */
  initialState?: PrimitiveObject;
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
      addEventListener: (_eventName, _listener) => () => {},
      loose: {},
      isWebViewBridgeAvailable: initialBridgeMethodNames.length > 0,
      isNativeMethodAvailable: (method: string) =>
        initialBridgeMethodNames.includes(method),
      store: mockStore(
        options?.initialBridge as PrimitiveObject | undefined,
      ) as unknown as Omit<T, "setState">,
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
      ({
        bridgeMethods,
        nativeInitialState,
        initialState,
      }: HydrateEventPayload) => {
        unsubscribe();
        instance._hydrate(bridgeMethods, nativeInitialState ?? initialState);
      },
    );
  }

  // Must run after the "hydrate" listener is registered: native may have
  // queued a "hydrate" event before this bridge existed.
  instance._flushBatchedEvents();

  if (!instance._hasNativeBridgeMethods && instance.isReactNativeWebView) {
    instance._requestHydrate();
  }

  const { onFallback, onReady, initialBridge } = options;

  const isInitialBridgeMethod = (methodName: string) =>
    typeof (initialBridge as Record<string, unknown> | undefined)?.[
      methodName
    ] === "function";

  /**
   * Native has not told us its methods yet (e.g. Android injected them after
   * this script ran), but we are inside a React Native WebView: send the call
   * to native instead of falling back. Native answers it, or reports the
   * method as missing.
   */
  const callNativeBeforeHydration = (methodName: string) => {
    if (instance._hasNativeBridgeMethods || !instance.isReactNativeWebView) {
      return undefined;
    }
    const nativeMethod = instance._nativeMethod(methodName);
    return (...args: unknown[]) =>
      nativeMethod(...args).catch((error: unknown) => {
        throw isMethodNotFoundResponse(error)
          ? new MethodNotFoundError(methodName)
          : error;
      });
  };

  const fallbackMethod = (methodName: string) => {
    instance._postMessage("fallback", { method: methodName });

    if (instance._willMethodThrowOnError(methodName)) {
      return (...args: unknown[]) => {
        invokeCallback("onFallback", onFallback, methodName, args);
        return Promise.reject(new MethodNotFoundError(methodName));
      };
    }

    if (options.debug) {
      console.warn(
        `[WebViewBridge] ${methodName} is not defined, using fallback.`,
      );
    }
    return () => Promise.resolve();
  };

  const proxy = new Proxy(instance, {
    get: (target, methodName) => {
      if (methodName in target) {
        // In a React Native WebView, native takes priority over initialBridge.
        if (
          typeof methodName === "string" &&
          isInitialBridgeMethod(methodName)
        ) {
          return (
            callNativeBeforeHydration(methodName) ??
            Reflect.get(target, methodName)
          );
        }
        return Reflect.get(target, methodName);
      }

      // Not a bridge method name. Returning a function for `then` would make
      // the bridge a thenable that never settles when awaited.
      if (typeof methodName !== "string" || methodName === "then") {
        return undefined;
      }

      return (
        callNativeBeforeHydration(methodName) ?? fallbackMethod(methodName)
      );
    },
  }) as unknown as LinkBridge<
    ExcludePrimitive<ExtractStore<T>>,
    Omit<T, "setState">,
    V
  >;

  onReady?.(proxy);
  return proxy;
};
