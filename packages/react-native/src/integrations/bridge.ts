import type {
  Bridge,
  BridgeStore,
  OnlyJSON,
  Primitive,
} from "@webview-bridge/types";
import { equals, removeUndefinedKeys } from "@webview-bridge/utils";
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

  try {
    const request: BridgeRequest = {
      url,
      method,
      args: args ?? [],
    };
    const response = await runBridgeMiddleware(bridge, request, () =>
      _method(...request.args),
    );

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
