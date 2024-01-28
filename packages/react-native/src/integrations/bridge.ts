import type { Bridge, BridgeStore, OnlyPrimitive } from "@webview-bridge/types";
import WebView from "react-native-webview";

import { removeUndefinedKeys } from "../utils/removeUndefinedKeys";

export type Store<BridgeObject extends Bridge> = ({
  get,
  set,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: () => BridgeObject;
  set: (newState: Partial<OnlyPrimitive<BridgeObject>>) => void;
}) => BridgeObject;

export const bridge = <BridgeObject extends Bridge>(
  procedures: BridgeObject | Store<BridgeObject>,
): BridgeStore<BridgeObject> => {
  const getState = () => state;

  const setState = (newState: Partial<OnlyPrimitive<BridgeObject>>) => {
    state = {
      ...state,
      ...removeUndefinedKeys(newState),
    };
    emitChange();
  };

  let state: BridgeObject =
    typeof procedures === "function"
      ? procedures({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: getState,
          set: setState,
        })
      : procedures;

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
  };
};

type HandleBridgeArgs<ArgType = unknown> = {
  bridge: BridgeStore<Bridge>;
  method: string;
  args?: ArgType[];
  webview: WebView;
  eventId: string;
};

export const handleBridge = async ({
  bridge,
  method,
  args,
  webview,
  eventId,
}: HandleBridgeArgs) => {
  const _bridge = bridge.getState();

  const _method = _bridge[method];
  if (typeof _method !== "function") {
    return;
  }

  try {
    const response = await _method?.(...(args ?? []));

    webview.injectJavaScript(`
    window.nativeEmitter.emit('${method}-${eventId}',${JSON.stringify(
      response,
    )});
  
    true;
  `);
  } catch (error) {
    console.error(error);
    webview.injectJavaScript(`
    window.nativeEmitter.emit('${method}-${eventId}', {}, true);

    true;
  `);
  }
};

export const INTEGRATIONS_SCRIPTS_BRIDGE = (bridgeNames: string[]) => `
    window.__bridgeMethods__ = [${bridgeNames.join(", ")}];
`;
