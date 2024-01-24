import WebView from "react-native-webview";

import type { MethodBridge } from "../types/bridge";

export const bridge = <BridgeObject extends Omit<MethodBridge, "__signature">>(
  procedures: BridgeObject,
): MethodBridge<BridgeObject> => {
  return {
    ...procedures,
    __signature: "methodBridge",
  } as MethodBridge<BridgeObject>;
};

type HandleBridgeArgs = {
  bridge: MethodBridge;
  method: string;
  args?: unknown[];
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
  try {
    const response = await bridge[method]?.(...(args ?? []));

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

export const INTEGRATIONS_SCRIPTS_METHOD_BRIDGE = (bridgeNames: string[]) => `
    window.__bridgeMethods__ = [${bridgeNames.join(", ")}];
`;
