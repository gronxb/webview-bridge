import type { Bridge } from "@webview-bridge/types";
import {
  type EventEmitter,
  createRandomId,
  createResolver,
  timeout,
} from "@webview-bridge/utils";
import type WebView from "react-native-webview";

import { WebMethodError } from "../error";

export const handleRegisterWebMethod = (
  emitter: EventEmitter,
  webview: WebView,
  bridgeNames: string[],
  responseTimeout: number,
) => {
  return bridgeNames.reduce((acc, methodName) => {
    acc[methodName] = async (...args: unknown[]) => {
      const eventId = createRandomId();

      return Promise.race([
        createResolver({
          emitter,
          methodName,
          eventId,
          evaluate: () => {
            webview.injectJavaScript(
              `
              window.webEmitter.emit('${methodName}', '${eventId}', ${JSON.stringify(
                args,
              )});
            
              true;
              `,
            );
          },
          failHandler: new WebMethodError(methodName),
        }),
        timeout(responseTimeout),
      ]);
    };

    return acc;
  }, {} as Bridge);
};
