import type { Bridge, BridgeStore, OnlyJSON } from "@webview-bridge/types";
import {
  type DefaultEmitter,
  equals,
  removeUndefinedKeys,
} from "@webview-bridge/utils";

export type Store<BridgeObject extends Bridge> = ({
  get,
  set,
}: {
  get: () => BridgeObject;
  set: (newState: Partial<OnlyJSON<BridgeObject>>) => void;
}) => BridgeObject;

export const linkBridgeStore = <
  T extends BridgeStore<T extends Bridge ? T : any>,
>(
  emitter: DefaultEmitter,
  initialState: Partial<T> = {},
): Omit<T, "setState"> => {
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

  let state: T = { ...initialState } as T;

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

  const store = {
    getState,
    subscribe,
  } as unknown as Omit<T, "setState">;

  linkBridgeStoreHydrators.set(store, (newState) => {
    const prevState = state;
    state = { ...state, ...newState } as T;
    emitChange(state, prevState);
  });

  return store;
};

const linkBridgeStoreHydrators = new WeakMap<
  object,
  (newState: Record<string, unknown>) => void
>();

/**
 * Merge late-arriving native methods and state into an existing store, so
 * subscribers that already hold this store (e.g. `useBridgeStore`) see them.
 * Returns `false` if `store` was not created by `linkBridgeStore`.
 */
export const hydrateLinkBridgeStore = (
  store: object,
  newState: Record<string, unknown>,
) => {
  const hydrate = linkBridgeStoreHydrators.get(store);
  if (!hydrate) {
    return false;
  }
  hydrate(newState);
  return true;
};
