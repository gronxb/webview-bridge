import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  KeyOfOrString,
  LinkBridgeOptions,
  Parser,
  ParserSchema,
} from "@webview-bridge/web";
import { linkBridge } from "@webview-bridge/web";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";

import { useBridge } from "./useBridge";

export interface BridgeProviderProps {
  children: ReactNode;
}

export const createLinkBridgeProvider = <
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any> = ParserSchema<any>,
>(
  options?: LinkBridgeOptions<T, V>,
) => {
  const bridge = linkBridge<T, V>(options);
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

    return {
      isNativeMethodAvailable: (
        method: keyof ExcludePrimitive<ExtractStore<T>>,
      ) => bridgeStoreContext.isNativeMethodAvailable(method),
      isWebViewBridgeAvailable: bridgeStoreContext.isWebViewBridgeAvailable,
    };
  };

  const useBridgeLoose = () => {
    const bridgeStoreContext = useContext(BridgeContext);

    if (!bridgeStoreContext) {
      throw new Error(`useBridgeLoose must be used within a BridgeProvider`);
    }

    return { loose: bridgeStoreContext.loose };
  };

  const useBridgeEventListener = <EventName extends KeyOfOrString<V>>(
    eventName: EventName,
    listener: (args: Parser<V, EventName>) => void,
  ) => {
    const bridgeStoreContext = useContext(BridgeContext);

    if (!bridgeStoreContext) {
      throw new Error(
        `useBridgeEventListener must be used within a BridgeProvider`,
      );
    }
    useEffect(() => {
      return bridgeStoreContext.addEventListener(eventName, listener);
    }, []);
  };

  return {
    bridge,
    BridgeProvider,
    useBridgeStore,
    useBridgeStatus,
    useBridgeLoose,
    useBridgeEventListener,
  };
};
