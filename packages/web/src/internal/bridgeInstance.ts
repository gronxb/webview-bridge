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
  createRandomId,
  createResolver,
  DefaultEmitter,
  timeout,
} from "@webview-bridge/util";

import { NativeMethodError } from "../error";
import { LinkBridgeOptions } from "../linkBridge";
import { LinkBridge } from "../types";
import { createPromiseProxy } from "./createPromiseProxy";
import { linkBridgeStore } from "./linkBridgeStore";
import { mockStore } from "./mockStore";

export class BridgeInstance<
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any> = ParserSchema<any>,
> {
  constructor(
    private options: LinkBridgeOptions<T, V>,

    private _emitter: DefaultEmitter,
    private _bridgeMethods: string[],
    public _nativeInitialState: PrimitiveObject,
  ) {
    this._hydrate(_bridgeMethods, _nativeInitialState);
  }

  private defaultTimeoutMs = 2000;

  public store: Omit<T, "setState"> = mockStore() as unknown as Omit<
    T,
    "setState"
  >;

  get isWebViewBridgeAvailable() {
    return Boolean(window.ReactNativeWebView) && this._bridgeMethods.length > 0;
  }

  public isNativeMethodAvailable(methodName: string) {
    return (
      typeof methodName === "string" &&
      Boolean(window.ReactNativeWebView) &&
      this._bridgeMethods.includes(methodName)
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

  private _postMessage(type: string, body?: unknown) {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify(
        body
          ? {
              type,
              body,
            }
          : {
              type,
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

  private _willMethodThrowOnError(methodName: string) {
    const { throwOnError } = this.options;
    return (
      throwOnError === true ||
      (Array.isArray(throwOnError) && throwOnError.includes(methodName))
    );
  }

  private _createLoose(
    initialState: LinkBridge<ExtractStore<T>, Omit<T, "setState">, V>,
  ) {
    const { timeout: timeoutMs = this.defaultTimeoutMs, onFallback } =
      this.options;

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
    this._bridgeMethods = bridgeMethods;
    this._nativeInitialState = nativeInitialState;

    const { timeout: timeoutMs = this.defaultTimeoutMs, onFallback } =
      this.options;

    const initialState = bridgeMethods.reduce(
      (acc, methodName) => {
        const nativeMethod = this._createNativeMethod(
          methodName,
          this._willMethodThrowOnError(methodName),
          timeoutMs,
          onFallback,
        );

        (this as any)[methodName] = nativeMethod;

        return {
          ...acc,
          [methodName]: nativeMethod,
        };
      },
      {} as LinkBridge<ExtractStore<T>, Omit<T, "setState">, V>,
    );

    this.loose = this._createLoose(initialState);

    this.store = linkBridgeStore<T>(
      this._emitter,
      initialState,
      nativeInitialState as ExtractStore<T>,
    );

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this._postMessage("getBridgeState");
      }
    });
    this._postMessage("getBridgeState");

    for (const [eventName, ...args] of window.nativeBatchedEvents ?? []) {
      this._emitter.emit(eventName, ...args);
    }
    window.nativeBatchedEvents = [];
    return true;
  }
}
