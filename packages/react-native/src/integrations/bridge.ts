import type {
  Bridge,
  BridgeStore,
  OnlyJSON,
  Primitive,
} from "@webview-bridge/types";
import { equals, removeUndefinedKeys } from "@webview-bridge/utils";
import WebView from "react-native-webview";

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
};

export const handleBridge = async ({
  bridge,
  method,
  args,
  webview,
  eventId,
}: HandleBridgeArgs) => {
  const _bridge = bridge.getState();

  const _method = _bridge[method];
  const handleThrow = () => {
    webview.injectJavaScript(SAFE_NATIVE_EMITTER_THROW(`${method}-${eventId}`));
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
      SAFE_NATIVE_EMITTER_EMIT(`${method}-${eventId}`, response),
    );
  } catch (error) {
    handleThrow();
    console.error(error);
  }
};

export const INJECT_BRIDGE_METHODS = (bridgeNames: string[]) => `
    window.__bridgeMethods__ = ${JSON.stringify(bridgeNames)};
`;

export const INJECT_BRIDGE_STATE = (
  initialState: Record<string, Primitive>,
) => `
    window.__bridgeInitialState__ = ${JSON.stringify(initialState)};
`;

export const SAFE_NATIVE_EMITTER_EMIT = (eventName: string, data: unknown) => {
  const dataString = JSON.stringify(data);
  return `
if (window.nativeEmitter) {
  window.nativeEmitter.emit('${eventName}', ${dataString});
} else {
  window.nativeBatchedEvents = window.nativeBatchedEvents || [];
  window.nativeBatchedEvents.push(['${eventName}', ${dataString}]);
}
true;
`;
};

export const SAFE_NATIVE_EMITTER_THROW = (eventName: string) => `
if (window.nativeEmitter) {
  window.nativeEmitter.emit('${eventName}', {}, true);
} else {
  window.nativeBatchedEvents = window.nativeBatchedEvents || [];
  window.nativeBatchedEvents.push(['${eventName}', {}, true]);
}
true;
`;
