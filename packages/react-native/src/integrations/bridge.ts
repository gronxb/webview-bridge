import type {
  Bridge,
  BridgeStore,
  OnlyJSON,
  Primitive,
} from "@webview-bridge/types";
import { equals, removeUndefinedKeys } from "@webview-bridge/utils";
import type WebView from "react-native-webview";
import { serializeError } from "../error";

export type StoreCallback<T> = ({
  get,
  set,
}: {
  get: () => T;
  set: (newState: Partial<OnlyJSON<T>>) => void;
}) => T;

export const bridge = <T extends Bridge>(
  procedures: T | StoreCallback<T>,
): BridgeStore<T> => {
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

  return {
    getState,
    setState,
    subscribe,
  } as BridgeStore<T>;
};

type HandleBridgeArgs<ArgType = unknown> = {
  bridge: BridgeStore<Bridge>;
  method: string;
  args?: ArgType[];
  webview: WebView;
  eventId: string;
  bridgeId: string;
};

export const handleBridge = async ({
  bridge,
  method,
  args,
  webview,
  eventId,
  bridgeId,
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
    const response = await _method?.(...(args ?? []));

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
