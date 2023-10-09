import WebView from "react-native-webview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Procedure = (...args: any[]) => any;

export type ProceduresObject<T extends Record<string, Procedure>> = {
  [K in keyof T]: (
    ...args: Parameters<T[K]>
  ) => Promise<Awaited<ReturnType<T[K]>>>;
};

export type Bridge = <T extends Record<string, Procedure>>(
  procedures: T,
) => ProceduresObject<T>;

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
    window.bridgeEmitter.emit('${method}-${eventId}',${JSON.stringify(
      response,
    )});
  
    true;
  `);
};

export const INTEGRATIONS_SCRIPTS_BRIDGE = (bridgeNames: string[]) => `
    window.__bridgeMethods__ = [${bridgeNames.join(", ")}];
`;
