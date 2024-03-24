import type { Bridge, BridgeStore } from "@webview-bridge/web";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector.js";

export const useBridge = <T extends Bridge, U>(
  store: Omit<BridgeStore<T>, "setState">,
  selector?: (state: T) => U,
): U => {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    selector ?? ((state: T) => state as unknown as U),
  );
};
