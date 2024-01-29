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

export const linkBridge = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BridgeStore<T extends Bridge ? T : any>,
>(): T => {
  if (!window.ReactNativeWebView) {
    console.warn("[WebViewBridge] Not in a WebView environment");
  }

  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

  emitter.on("bridgeStateChange", (data) => {
    setState(data);
  });

  const getState = () => state;

  const setState = (newState: Partial<OnlyPrimitive<T>>) => {
    state = {
      ...state,
      ...removeUndefinedKeys(newState),
    };
    emitChange();
  };

  let state: T = window.__bridgeInitialState__ as T;

  const listeners = new Set<() => void>();

  const emitChange = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    getState,
    setState,
    subscribe,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};
