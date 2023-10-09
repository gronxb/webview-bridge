import WebView from "react-native-webview";

import type { Bridge, Procedure, ProceduresObject } from "../types";

export const bridge: Bridge = (procedures) => {
  return procedures;
};

type HandleBridgeArgs<ArgType = unknown> = {
  bridge: ProceduresObject<Record<string, Procedure>>;
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
