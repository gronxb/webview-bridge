import { Bridge, BridgeStore, OnlyPrimitive } from "@webview-bridge/types";
import { removeUndefinedKeys } from "@webview-bridge/util";

import { emitter } from "./emitter";

export type Store<BridgeObject extends Bridge> = ({
  get,
  set,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: () => BridgeObject;
  set: (newState: Partial<OnlyPrimitive<BridgeObject>>) => void;
}) => BridgeObject;

export const linkBridgeStore = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BridgeStore<T extends Bridge ? T : any>,
>(): T => {
  if (!window.ReactNativeWebView) {
    console.warn("[WebViewBridge] Not in a WebView environment");
  }

  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

  const getState = () => state;

  const setState = (newState: Partial<OnlyPrimitive<T>>) => {
    const prevState = state;
    state = {
      ...state,
      ...removeUndefinedKeys(newState),
    };

    emitChange(state, prevState);
  };

  emitter.on("bridgeStateChange", (data) => {
    setState(data);
  });

  let state: T = (window.__bridgeInitialState__ ?? {}) as T;

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
  } as unknown as T;
};
