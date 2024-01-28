import {
  createRandomId,
  createResolver,
  type EventEmitter,
  timeout,
} from "@webview-bridge/util";
import WebView from "react-native-webview";

import { WebMethodError } from "../error";
import { Bridge } from "../types/bridge";

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
        createResolver(
          emitter,
          methodName,
          eventId,
          () => {
            webview.injectJavaScript(
              `
              window.webEmitter.emit('${methodName}', '${eventId}', ${JSON.stringify(
                args,
              )});
            
              true;
              `,
            );
          },
          new WebMethodError(methodName),
        ),
        timeout(responseTimeout),
      ]);
    };

    return acc;
  }, {} as Bridge);
};
