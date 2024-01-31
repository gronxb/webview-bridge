import { Bridge, BridgeStore, OnlyJSON } from "@webview-bridge/types";
import { equals, removeUndefinedKeys } from "@webview-bridge/util";

import { emitter } from "./emitter";

export type Store<BridgeObject extends Bridge> = ({
  get,
  set,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: () => BridgeObject;
  set: (newState: Partial<OnlyJSON<BridgeObject>>) => void;
}) => BridgeObject;

export const linkBridgeStore = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BridgeStore<T extends Bridge ? T : any>,
>(
  initialState: Partial<T> = {},
): Omit<T, "setState"> => {
  if (!window.ReactNativeWebView) {
    console.warn("[WebViewBridge] Not in a WebView environment");
  }

  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

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

  emitter.on("bridgeStateChange", (data) => {
    setState(data);
  });

  window.ReactNativeWebView?.postMessage(
    JSON.stringify({
      type: "getBridgeState",
    }),
  );

  let state: T = { ...initialState, ...window.__bridgeInitialState__ } as T;

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
    subscribe,
  } as unknown as Omit<T, "setState">;
};
