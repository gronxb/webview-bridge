import type { Bridge, BridgeStore, ExtractStore } from "@webview-bridge/web";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

export function useBridge<T extends Bridge>(
  store: Omit<BridgeStore<T>, "setState">,
): ExtractStore<BridgeStore<T>>;

export function useBridge<
  T extends Bridge,
  U extends ExtractStore<BridgeStore<T>>,
  V,
>(store: Omit<BridgeStore<T>, "setState">, selector?: (state: U) => V): V;

export function useBridge<T extends Bridge, U>(
  store: Omit<BridgeStore<T>, "setState">,
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
