import WebView from "react-native-webview";

import type { Bridge } from "../types/bridge";

export const bridge = <BridgeObject extends Bridge>(
  procedures: BridgeObject,
): BridgeObject => {
  return procedures;
};

type HandleBridgeArgs<ArgType = unknown> = {
  bridge: Bridge;
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
  const response = await bridge[method]?.(...(args ?? []));

  webview.injectJavaScript(`
    window.nativeEmitter.emit('${method}-${eventId}',${JSON.stringify(
      response,
    )});
  
    true;
  `);
};

export const INTEGRATIONS_SCRIPTS_BRIDGE = (bridgeNames: string[]) => `
    window.__bridgeMethods__ = [${bridgeNames.join(", ")}];
`;
