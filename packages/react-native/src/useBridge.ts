import { useSyncExternalStore } from "react";

import type { Bridge, BridgeStore } from "./types/bridge";

export const useBridge = <T extends Bridge>(store: BridgeStore<T>) => {
  return useSyncExternalStore(store.subscribe, store.getState);
};
