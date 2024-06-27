import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
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

import { MethodNotFoundError, NativeMethodError } from "../error";
import { LinkBridgeOptions } from "../linkBridge";
import { LinkBridge } from "../types";
import { linkBridgeStore } from "./linkBridgeStore";

export class BridgeInstance<
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any> = ParserSchema<any>,
> {
  private defaultTimeoutMs = 2000;
  private $proxy: LinkBridge<
    ExcludePrimitive<ExtractStore<T>>,
    Omit<T, "setState">,
    V
  >;

  constructor(
    private options: LinkBridgeOptions<T, V>,

    public emitter: DefaultEmitter,
    public bridgeMethods: string[],
    public nativeInitialState: PrimitiveObject,
  ) {
    this.$proxy = this.hydrate(bridgeMethods, nativeInitialState);
  }

  private postMessage(type: string, body?: unknown) {
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

  private createNativeMethod(
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
            emitter: this.emitter,
            methodName,
            eventId,
            evaluate: () => {
              this.postMessage("bridge", {
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

  private willMethodThrowOnError(methodName: string) {
    const { throwOnError } = this.options;
    return (
      throwOnError === true ||
      (Array.isArray(throwOnError) && throwOnError.includes(methodName))
    );
  }

  private createLoose(
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
        return this.createNativeMethod(
          methodName,
          this.willMethodThrowOnError(methodName),
          timeoutMs,
          onFallback,
        );
      },
    });
  }

  public hydrate(
    bridgeMethods: string[],
    nativeInitialState: PrimitiveObject = {},
  ) {
    const {
      timeout: timeoutMs = this.defaultTimeoutMs,
      onFallback,
      onReady,
    } = this.options;

    const initialState = bridgeMethods.reduce(
      (acc, methodName) => {
        return {
          ...acc,
          [methodName]: this.createNativeMethod(
            methodName,
            this.willMethodThrowOnError(methodName),
            timeoutMs,
            onFallback,
          ),
        };
      },
      {} as LinkBridge<ExtractStore<T>, Omit<T, "setState">, V>,
    );

    const loose = this.createLoose(initialState);

    const store = linkBridgeStore<T>(
      this.emitter,
      initialState,
      nativeInitialState as ExtractStore<T>,
    );

    Object.assign(initialState, {
      loose,
      store,
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
        return this.emitter.on(`postMessage/${String(eventName)}`, listener);
      },
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.postMessage("getBridgeState");
      }
    });
    this.postMessage("getBridgeState");

    const proxy = new Proxy(initialState, {
      get: (target, methodName: string) => {
        if (methodName in target) {
          return target[methodName];
        }

        this.postMessage("fallback", {
          method: methodName,
        });

        if (this.willMethodThrowOnError(methodName)) {
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
    });

    for (const [eventName, ...args] of window.nativeBatchedEvents ?? []) {
      this.emitter.emit(eventName, ...args);
    }
    window.nativeBatchedEvents = [];

    onReady?.(proxy);
    this.$proxy = proxy;
    return proxy;
  }

  get proxy() {
    return this.$proxy;
  }
}
