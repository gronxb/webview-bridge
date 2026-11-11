import type {
  Bridge,
  BridgeStore,
  ExtractStore,
  KeyOfOrString,
  Parser,
  ParserSchema,
  PrimitiveObject,
} from "@webview-bridge/types";
import {
  type DefaultEmitter,
  NativeMethodError,
  createRandomId,
  createResolver,
  timeout,
} from "@webview-bridge/utils";

import type { LinkBridgeOptions } from "../linkBridge";
import type { LinkBridge } from "../types";
import { createPromiseProxy } from "./createPromiseProxy";
import { linkBridgeStore } from "./linkBridgeStore";
import { mockStore } from "./mockStore";

export class BridgeInstance<
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any> = ParserSchema<any>,
> {
  constructor(
    private _bridgeId: string,
    private _options: LinkBridgeOptions<T, V>,

    private _emitter: DefaultEmitter,
    private _bridgeMethods: string[],
    public _nativeInitialState: PrimitiveObject,
  ) {
    this._hydrate(_bridgeMethods, _nativeInitialState);
  }

  private _defaultTimeoutMs = 2000;

  private _isListenerRegistered = false;

  public store: Omit<T, "setState"> = mockStore() as unknown as Omit<
    T,
    "setState"
  >;

  /** Merges hydrated methods and state into `store` (set on first hydrate). */
  private _mergeIntoStore?: (newState: Partial<T>) => void;

  get isReactNativeWebView() {
    return Boolean(window.ReactNativeWebView);
  }

  /**
   * `true` once native has told this bridge which methods it provides, either
   * through the injected `__bridgeMethods__` or a later "hydrate" event.
   */
  /** @internal */
  get _hasNativeBridgeMethods() {
    return this._nativeBridgeMethodCount > 0;
  }

  private _nativeBridgeMethodCount = 0;

  get isWebViewBridgeAvailable() {
    return this._bridgeMethods.length > 0;
  }

  public isNativeMethodAvailable(methodName: string) {
    return (
      typeof methodName === "string" && this._bridgeMethods.includes(methodName)
    );
  }

  public addEventListener<EventName extends KeyOfOrString<V>>(
    eventName: EventName,
    listener: (args: Parser<V, EventName>) => void,
  ) {
    return this._emitter.on(`postMessage/${String(eventName)}`, listener);
  }

  public loose: LinkBridge<ExtractStore<T>, Omit<T, "setState">, V> =
    createPromiseProxy() as LinkBridge<ExtractStore<T>, Omit<T, "setState">, V>;

  /** @internal */
  public _postMessage(type: string, body?: unknown) {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify(
        body
          ? {
              type,
              body,
              bridgeId: this._bridgeId,
            }
          : {
              type,
              bridgeId: this._bridgeId,
            },
      ),
    );
  }

  private _createNativeMethod(
    methodName: string,
    throwOnError: boolean,
    timeoutMs: number,
    onFallback?: (methodName: string, args: unknown[]) => void,
  ) {
    return (...args: unknown[]) => {
      const eventId = createRandomId();

      return Promise.race(
        [
          createResolver({
            emitter: this._emitter,
            methodName,
            eventId,
            evaluate: () => {
              this._postMessage("bridge", {
                method: methodName,
                eventId,
                args,
              });
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
  }

  /**
   * A function that sends `methodName` to native, regardless of whether native
   * has announced it or `initialBridge` defines it.
   */
  /** @internal */
  public _nativeMethod(methodName: string) {
    const { timeout: timeoutMs = this._defaultTimeoutMs, onFallback } =
      this._options;
    return this._createNativeMethod(
      methodName,
      this._willMethodThrowOnError(methodName),
      timeoutMs,
      onFallback,
    );
  }

  /** @internal */
  public _willMethodThrowOnError(methodName: string) {
    const { throwOnError } = this._options;
    return (
      throwOnError === true ||
      (Array.isArray(throwOnError) && throwOnError.includes(methodName))
    );
  }

  private _createLoose(
    initialState: LinkBridge<ExtractStore<T>, Omit<T, "setState">, V>,
  ) {
    const { timeout: timeoutMs = this._defaultTimeoutMs, onFallback } =
      this._options;

    return new Proxy(initialState, {
      get: (target, methodName: string) => {
        if (
          methodName in target &&
          !["isWebViewBridgeAvailable", "isNativeMethodAvailable"].includes(
            methodName,
          )
        ) {
          return target[methodName];
        }
        return this._createNativeMethod(
          methodName,
          this._willMethodThrowOnError(methodName),
          timeoutMs,
          onFallback,
        );
      },
    });
  }

  public _hydrate(
    bridgeMethods: string[],
    nativeInitialState: PrimitiveObject = {},
  ) {
    const {
      timeout: timeoutMs = this._defaultTimeoutMs,
      onFallback,
      initialBridge = {},
    } = this._options;

    const initialMethods = Object.entries(initialBridge).filter(
      ([_, bridge]) => typeof bridge === "function",
    );
    const initialBridgeMethodNames = initialMethods.map(
      ([methodName]) => methodName,
    );

    Object.defineProperties(
      this,
      Object.fromEntries(
        initialMethods.map(([methodName, value]) => {
          return [
            methodName,
            {
              value,
              writable: true,
            },
          ];
        }),
      ),
    );

    this._bridgeMethods = [...bridgeMethods, ...initialBridgeMethodNames];
    this._nativeBridgeMethodCount = bridgeMethods.length;
    this._nativeInitialState = nativeInitialState;

    const nativeMethods = bridgeMethods.reduce(
      (acc, methodName) => {
        if (!this.isReactNativeWebView) {
          return acc;
        }

        const nativeMethod = this._createNativeMethod(
          methodName,
          this._willMethodThrowOnError(methodName),
          timeoutMs,
          onFallback,
        );

        Object.defineProperty(this, methodName, {
          value: nativeMethod,
          writable: false,
        });

        return Object.assign(acc, {
          [methodName]: nativeMethod,
        });
      },
      { ...initialBridge } as LinkBridge<
        ExtractStore<T>,
        Omit<T, "setState">,
        V
      >,
    );

    this.loose = this._createLoose(nativeMethods);
    const hydratedState = {
      ...nativeMethods,
      ...nativeInitialState,
    } as Partial<T>;
    if (this._mergeIntoStore) {
      // Keep the same store object so existing subscribers see late methods.
      this._mergeIntoStore(hydratedState);
    } else {
      const { store, merge } = linkBridgeStore<T>(this._emitter, hydratedState);
      this.store = store;
      this._mergeIntoStore = merge;
    }

    if (!this._isListenerRegistered) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          this._postMessage("getBridgeState");
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      this._isListenerRegistered = true;
    }

    this._postMessage("getBridgeState");
    return true;
  }

  /**
   * Replay events native injected before any bridge emitter existed (e.g. a
   * "hydrate" that reached the page before `linkBridge()` ran).
   */
  /** @internal */
  public _flushBatchedEvents() {
    const events = window.nativeBatchedEvents ?? [];
    window.nativeBatchedEvents = [];
    for (const [eventName, ...args] of events) {
      this._emitter.emit(eventName, ...args);
    }
  }

  /**
   * Ask native to send the "hydrate" event to this bridge. Used when the
   * injected `__bridgeMethods__` were not there yet (Android injects them
   * asynchronously). Native versions without support ignore the message.
   */
  /** @internal */
  public _requestHydrate() {
    this._postMessage("requestHydrate");
  }
}
