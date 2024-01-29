import type {
  Bridge,
  BridgeStore,
  OnlyPrimitive,
  Primitive,
} from "@webview-bridge/types";
import { removeUndefinedKeys } from "@webview-bridge/util";
import WebView from "react-native-webview";

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
    const prevState = state;
    state = {
      ...state,
      ...removeUndefinedKeys(newState),
    };

    emitChange(state, prevState);
  };

  let state: BridgeObject =
    typeof procedures === "function"
      ? procedures({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: getState,
          set: setState,
        })
      : procedures;

  const listeners = new Set<
    (newState: BridgeObject, prevState: BridgeObject) => void
  >();

  const emitChange = (newState: BridgeObject, prevState: BridgeObject) => {
    for (const listener of listeners) {
      listener(newState, prevState);
    }
  };

  const subscribe = (
    listener: (newState: BridgeObject, prevState: BridgeObject) => void,
  ) => {
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

export const INJECT_BRIDGE_METHODS = (bridgeNames: string[]) => `
    window.__bridgeMethods__ = [${bridgeNames.join(", ")}];
`;

export const INJECT_BRIDGE_STATE = (
  initialState: Record<string, Primitive>,
) => `
    window.__bridgeInitialState__ = ${JSON.stringify(initialState)};
`;
