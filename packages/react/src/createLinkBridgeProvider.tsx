import type {
  Bridge,
  BridgeStore,
  LinkBridgeOptions,
} from "@webview-bridge/web";
import { linkBridge } from "@webview-bridge/web";
import { createContext, type ReactNode, useContext, useRef } from "react";

import { useBridge } from "./useBridge";

export interface BridgeProviderProps {
  children: ReactNode;
}

export const createLinkBridgeProvider = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BridgeStore<T extends Bridge ? T : any>,
>(
  options?: LinkBridgeOptions<T>,
) => {
  const bridge = linkBridge<T>(options);
  const BridgeContext = createContext<BridgeStore | null>(null);

  type BridgeStore = typeof bridge;
  type BridgeSelector = ReturnType<typeof bridge.store.getState>;

  const BridgeProvider = ({ children }: BridgeProviderProps) => {
    const storeRef = useRef<BridgeStore>();
    if (!storeRef.current) {
      storeRef.current = bridge;
    }

    return (
      <BridgeContext.Provider value={storeRef.current}>
        {children}
      </BridgeContext.Provider>
    );
  };

  const useBridgeStore = <U,>(selector: (state: BridgeSelector) => U): U => {
    const bridgeStoreContext = useContext(BridgeContext);

    if (!bridgeStoreContext) {
      throw new Error(`useBridgeStore must be used within a BridgeProvider`);
    }

    return useBridge(bridgeStoreContext.store, selector as (state: T) => U);
  };

  const useBridgeStatus = () => {
    const bridgeStoreContext = useContext(BridgeContext);

    if (!bridgeStoreContext) {
      throw new Error(`useBridgeStatus must be used within a BridgeProvider`);
    }

    const { isNativeMethodAvailable, isWebViewBridgeAvailable, loose } =
      bridgeStoreContext;
    return {
      isNativeMethodAvailable,
      isWebViewBridgeAvailable,
      loose,
    };
  };

  return { bridge, BridgeProvider, useBridgeStore, useBridgeStatus };
};
