import type {
  AsyncFunction,
  Bridge,
  BridgeStore,
  Delegated,
  OnlyJSON,
  Primitive,
} from "@webview-bridge/types";
import {
  equals,
  nativeCallAckEventName,
  removeUndefinedKeys,
} from "@webview-bridge/utils";
import type WebView from "react-native-webview";
import { serializeError } from "../error";

/**
 * A Web-to-Native bridge method request passed through bridge middleware.
 *
 * `url` is the current top-level WebView URL reported by
 * `react-native-webview`. It is not a verified origin for the frame that sent
 * the request. Context fields added by middleware are shared with downstream
 * middleware in the same request.
 */
type BridgeRequestBase = {
  readonly url?: string;
  readonly method: string;
  args: unknown[];
};

export type BridgeRequest<Context extends object = object> = BridgeRequestBase &
  Context;

/** Continue to the next middleware or native method. Await or return it. */
export type BridgeMiddlewareNext = () => Promise<unknown>;

export type BridgeMiddleware<Context extends object = object> = (
  request: BridgeRequest<Context>,
  next: BridgeMiddlewareNext,
) => unknown | Promise<unknown>;

export type BridgeMiddlewareBuilder<
  T extends Bridge,
  Context extends object = object,
> = {
  /**
   * Add middleware to this bridge instance's Web-to-Native request pipeline.
   */
  use<AddedContext extends object = object>(
    middleware: BridgeMiddleware<Context & AddedContext>,
  ): BridgeStore<T> & BridgeMiddlewareBuilder<T, Context & AddedContext>;
};

const DELEGATED_METHOD = Symbol.for("@webview-bridge/delegated-method");

/**
 * Declare a bridge method whose implementation is provided per WebView through
 * the `delegate` prop, so it can use values that only exist inside React
 * components (hooks, context, navigation of the current screen, ...).
 *
 * The method name is still part of the bridge, so the Web side gets its type
 * from `typeof appBridge` as usual. A WebView that does not provide the handler
 * does not expose the method to its page.
 *
 * @example
 * export const appBridge = bridge({
 *   goBack: delegate<() => Promise<void>>(),
 * });
 *
 * const navigation = useNavigation();
 * <WebView delegate={{ goBack: async () => navigation.goBack() }} />
 */
export const delegate = <F extends AsyncFunction>(): Delegated<F> => {
  const method = async () => {
    throw new Error(
      "[WebViewBridge] This method is declared with delegate(). Provide its implementation through the WebView `delegate` prop.",
    );
  };
  Object.defineProperty(method, DELEGATED_METHOD, { value: true });
  return method as unknown as Delegated<F>;
};

export const isDelegatedMethod = (value: unknown): boolean =>
  typeof value === "function" &&
  (value as unknown as Record<symbol, unknown>)[DELEGATED_METHOD] === true;

const bridgeMiddlewareMap = new WeakMap<object, BridgeMiddleware<object>[]>();

export type StoreCallback<T> = ({
  get,
  set,
}: {
  get: () => T;
  set: (newState: Partial<OnlyJSON<T>>) => void;
}) => T;

export const bridge = <T extends Bridge>(
  procedures: T | StoreCallback<T>,
): BridgeStore<T> & BridgeMiddlewareBuilder<T, object> => {
  const getState = () => state;

  const setState = (newState: Partial<OnlyJSON<T>>) => {
    const _newState = {
      ...state,
      ...removeUndefinedKeys(newState),
    };

    if (equals(state, _newState)) {
      return;
    }

    const prevState = state;
    state = _newState;
    emitChange(state, prevState);
  };

  let state: T =
    typeof procedures === "function"
      ? procedures({
          get: getState,
          set: setState,
        })
      : procedures;

  const listeners = new Set<(newState: T, prevState: T) => void>();

  const emitChange = (newState: T, prevState: T) => {
    for (const listener of listeners) {
      listener(newState, prevState);
    }
  };

  const subscribe = (listener: (newState: T, prevState: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const middlewares: BridgeMiddleware<object>[] = [];
  const store: BridgeStore<T> = {
    getState,
    setState,
    subscribe,
  };
  const middlewareStore = store as BridgeStore<T> &
    BridgeMiddlewareBuilder<T, object>;

  Object.defineProperty(store, "use", {
    enumerable: false,
    value(middleware: BridgeMiddleware<object>) {
      if (typeof middleware !== "function") {
        throw new TypeError("Bridge middleware must be a function");
      }
      middlewares.push(middleware);
      return middlewareStore;
    },
  });

  bridgeMiddlewareMap.set(store, middlewares);
  return middlewareStore;
};

type HandleBridgeArgs<ArgType = unknown> = {
  bridge: BridgeStore<Bridge>;
  method: string;
  args?: ArgType[];
  webview: WebView;
  eventId: string;
  bridgeId: string;
  url?: string;
  /** Implementations for `delegate()` methods, from the WebView's `delegate` prop. */
  delegate?: Partial<Record<string, AsyncFunction>>;
};

const runBridgeMiddleware = async (
  bridgeStore: BridgeStore<Bridge>,
  request: BridgeRequest,
  invokeMethod: () => Promise<unknown>,
) => {
  const middlewares = [...(bridgeMiddlewareMap.get(bridgeStore) ?? [])];

  const dispatch = async (index: number): Promise<unknown> => {
    const middleware = middlewares[index];
    if (!middleware) {
      return invokeMethod();
    }

    const nextState: {
      status: "not-called" | "pending" | "fulfilled" | "rejected";
      value?: unknown;
    } = { status: "not-called" };
    let nextCalled = false;
    let active = true;
    const next = () => {
      if (!active) {
        const rejection = Promise.reject(
          new Error("next() called after middleware completed"),
        );
        void rejection.catch(() => {});
        return rejection;
      }
      if (nextCalled) {
        throw new Error("next() called multiple times");
      }
      nextCalled = true;
      nextState.status = "pending";
      const nextPromise = dispatch(index + 1).then(
        (value) => {
          nextState.status = "fulfilled";
          nextState.value = value;
          return value;
        },
        (error) => {
          nextState.status = "rejected";
          throw error;
        },
      );
      void nextPromise.catch(() => {});
      return nextPromise;
    };

    let result: unknown;
    try {
      result = await middleware(request, next);
    } finally {
      active = false;
    }

    if (result === undefined && nextState.status === "fulfilled") {
      return nextState.value;
    }
    return result;
  };

  return dispatch(0);
};

export const handleBridge = async ({
  bridge,
  method,
  args,
  webview,
  eventId,
  bridgeId,
  url,
  delegate: delegateImpl,
}: HandleBridgeArgs) => {
  const _bridge = bridge.getState();

  const _method = _bridge[method];
  const handleThrow = (error?: Error) => {
    const serializedError = error ? serializeError(error) : true;
    webview.injectJavaScript(
      SAFE_NATIVE_EMITTER_THROW_BY_BRIDGE_ID(
        bridgeId,
        `${method}-${eventId}`,
        serializedError,
      ),
    );
  };
  if (!(method in _bridge)) {
    handleThrow();
    return;
  }
  if (typeof _method !== "function") {
    return;
  }
  // A delegate() method this WebView does not implement is not available to
  // its page, so answer like a missing method (MethodNotFoundError on the web).
  if (
    isDelegatedMethod(_method) &&
    typeof delegateImpl?.[method] !== "function"
  ) {
    console.warn(
      `[WebViewBridge] '${method}' is declared with delegate(), but this WebView has no \`delegate.${method}\`.`,
    );
    handleThrow();
    return;
  }

  // From here on the call always gets a response, so tell the page it arrived.
  // The page's `timeout` then stops applying, and long-running methods (dialogs,
  // pickers, in-app browsers) are not cut off. Pages that predate the ack ignore it.
  webview.injectJavaScript(
    SAFE_NATIVE_EMITTER_EMIT_BY_BRIDGE_ID(
      bridgeId,
      nativeCallAckEventName(method, eventId),
      null,
    ),
  );

  try {
    const request: BridgeRequest = {
      url,
      method,
      args: args ?? [],
    };
    const response = await runBridgeMiddleware(bridge, request, async () => {
      if (!isDelegatedMethod(_method)) {
        return _method(...request.args);
      }
      const handler = delegateImpl?.[method];
      if (typeof handler !== "function") {
        throw new Error(
          `[WebViewBridge] '${method}' is declared with delegate(), but this WebView has no \`delegate.${method}\`.`,
        );
      }
      return handler(...request.args);
    });

    webview.injectJavaScript(
      SAFE_NATIVE_EMITTER_EMIT_BY_BRIDGE_ID(
        bridgeId,
        `${method}-${eventId}`,
        response,
      ),
    );
  } catch (error) {
    handleThrow(error instanceof Error ? error : new Error(String(error)));
    console.error(error);
  }
};

/**
 * The payload of the "hydrate" event: the native method names and the
 * primitive initial state of `bridge`. A `delegate()` method is only listed
 * when `delegateImpl` implements it.
 */
export const createHydrateData = (
  bridge: BridgeStore<Bridge>,
  delegateImpl?: Partial<Record<string, AsyncFunction>>,
) => {
  const state = bridge.getState() ?? {};
  const bridgeMethods = Object.entries(state)
    .filter(([name, method]) => {
      if (typeof method !== "function") {
        return false;
      }
      // A delegate() method is only exposed when this WebView implements it.
      if (isDelegatedMethod(method)) {
        return typeof delegateImpl?.[name] === "function";
      }
      return true;
    })
    .map(([name]) => name);
  return { bridgeMethods, nativeInitialState: getPrimitiveState(bridge) };
};

/** The current non-function state of `bridge`. */
export const getPrimitiveState = (bridge: BridgeStore<Bridge>) =>
  Object.fromEntries(
    Object.entries(bridge.getState() ?? {}).filter(
      ([_, value]) => typeof value !== "function",
    ),
  ) as Record<string, Primitive>;

export const INJECT_BRIDGE_METHODS = (bridgeNames: string[]) => `
    (function() {
        window.__bridgeMethods__ = ${JSON.stringify(bridgeNames)};
    })();
`;

export const INJECT_BRIDGE_STATE = (
  initialState: Record<string, Primitive>,
) => `
    (function() {
        window.__bridgeInitialState__ = ${JSON.stringify(initialState)};
    })();
`;

export const SAFE_NATIVE_EMITTER_EMIT = (eventName: string, data: unknown) => {
  const dataString = JSON.stringify(data);
  return `
    (function() {
        if (window.nativeEmitterMap && Object.keys(window.nativeEmitterMap).length > 0) {
            for (const [_, emitter] of Object.entries(window.nativeEmitterMap)) {
                emitter.emit('${eventName}', ${dataString});
            }
        } else if (window.nativeEmitter) {
            // @deprecated This version is not used after 1.7.2
            window.nativeEmitter.emit('${eventName}', ${dataString});
        } else {
            window.nativeBatchedEvents = window.nativeBatchedEvents || [];
            window.nativeBatchedEvents.push(['${eventName}', ${dataString}]);
        }
        return true;
    })();
`;
};

export const SAFE_NATIVE_EMITTER_EMIT_BY_BRIDGE_ID = (
  bridgeId: string,
  eventName: string,
  data: unknown,
) => {
  const dataString = JSON.stringify(data);
  return `
    (function() {
        if (window.nativeEmitterMap && window.nativeEmitterMap['${bridgeId}']) {
            window.nativeEmitterMap['${bridgeId}'].emit('${eventName}', ${dataString});
        } else if (window.nativeEmitter) {
            // @deprecated This version is not used after 1.7.2
            window.nativeEmitter.emit('${eventName}', ${dataString});
        } else {
            window.nativeBatchedEvents = window.nativeBatchedEvents || [];
            window.nativeBatchedEvents.push(['${eventName}', ${dataString}]);
        }
        return true;
    })();
`;
};

export const SAFE_NATIVE_EMITTER_THROW_BY_BRIDGE_ID = (
  bridgeId: string,
  eventName: string,
  serializedError: string | true,
) => {
  const serializedErrorString = JSON.stringify(serializedError);
  return `
    (function() {
        if (window.nativeEmitterMap && window.nativeEmitterMap['${bridgeId}']) {
            window.nativeEmitterMap['${bridgeId}'].emit('${eventName}', {}, ${serializedErrorString});
        } else if (window.nativeEmitter) {
            // @deprecated This version is not used after 1.7.2
            window.nativeEmitter.emit('${eventName}', {}, ${serializedErrorString});
        } else {
            window.nativeBatchedEvents = window.nativeBatchedEvents || [];
            window.nativeBatchedEvents.push(['${eventName}', {}, ${serializedErrorString}]);
        }
        return true;
    })();
`;
};
