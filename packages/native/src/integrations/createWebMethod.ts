import WebView from "react-native-webview";

import { Procedure } from "../types";

export const handleCreateWebMethod = (
  webview: WebView,
  bridgeNames: string[],
) => {
  return bridgeNames.reduce(
    (acc, name) => {
      acc[name] = async (...args: unknown[]) => {
        webview.injectJavaScript(
          `window.webEmitter.emit('${name}',${JSON.stringify(args)});
        
          true;`,
        );
      };

      return acc;
    },
    {} as Record<string, Procedure>,
  );
};
