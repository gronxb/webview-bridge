import type { Bridge, BridgeStore, ExtractStore } from "@webview-bridge/types";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector.js";

export function useBridge<T extends Bridge>(
  store: BridgeStore<T>,
): ExtractStore<BridgeStore<T>>;

export function useBridge<
  T extends Bridge,
  U extends ExtractStore<BridgeStore<T>>,
  V,
>(store: BridgeStore<T>, selector?: (state: U) => V): V;

export function useBridge<T extends Bridge, U>(
  store: BridgeStore<T>,
  selector?: (state: T) => U,
): U {
  const $selector = selector ?? ((state: T) => state as unknown as U);

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    $selector,
  );
}
