import { createEvents } from "@rnbridge/util";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import React from "react";
import type { WebViewMessageEvent, WebViewProps } from "react-native-webview";
import WebView from "react-native-webview";

import {
  handleBridge,
  handleLog,
  INTEGRATIONS_SCRIPTS_BRIDGE,
  INTEGRATIONS_SCRIPTS_CONSOLE,
  LogType,
} from "./integrations";
import { handleCreateWebMethod } from "./integrations/createWebMethod";
import type { Procedure, ProceduresObject, RNBridgeWebView } from "./types";

export type CreateWebViewArgs<
  T extends ProceduresObject<Record<string, Procedure>>,
> = {
  bridge: T;
  debug?: boolean;
  responseTimeout?: number;
  fallback?: (method: keyof T) => void;
};

export type WebMethod<T> = T & {
  isReady: boolean;
};

export const createWebView = <
  T extends ProceduresObject<Record<string, Procedure>>,
>({
  bridge,
  debug,
  responseTimeout = 2000,
}: CreateWebViewArgs<T>) => {
  const WebMethod = {
    current: {
      isReady: false,
    },
  };

  const emitter = createEvents();
  return {
    WebView: forwardRef<RNBridgeWebView, WebViewProps>((props, ref) => {
      const webviewRef = useRef<WebView>(null);

      const bridgeNames = useMemo(
        () =>
          Object.values(bridge ?? {}).map((func) => {
            return `'${func.name}'`;
          }),
        [],
      );

      useImperativeHandle(ref, () => webviewRef.current as RNBridgeWebView, []);

      const handleMessage = async (event: WebViewMessageEvent) => {
        props.onMessage?.(event);

        if (!webviewRef.current) {
          return;
        }
        const { type, body } = JSON.parse(event.nativeEvent.data);

        switch (type) {
          case "log": {
            const { method, args } = body as {
              method: LogType;
              args: unknown[];
            };
            debug && handleLog(method, args);
            return;
          }
          case "bridge": {
            const { method, args, eventId } = body as {
              method: string;
              args: unknown[];
              eventId: string;
            };

            handleBridge({
              bridge,
              method,
              args,
              eventId,
              webview: webviewRef.current,
            });
            return;
          }
          case "createWebMethod": {
            const { bridgeNames } = body as {
              bridgeNames: string[];
            };
            Object.assign(
              WebMethod.current,
              handleCreateWebMethod(
                emitter,
                webviewRef.current,
                bridgeNames,
                responseTimeout,
              ),
            );
            WebMethod.current.isReady = true;
            return;
          }
          case "webMethodResponse": {
            const { eventId, funcName, value } = body as {
              eventId: string;
              funcName: string;
              value: unknown;
            };

            emitter.emit(`${funcName}-${eventId}`, value);
            return;
          }
        }
      };

      return (
        <WebView
          ref={webviewRef}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={[
            INTEGRATIONS_SCRIPTS_BRIDGE(bridgeNames),
            props.injectedJavaScriptBeforeContentLoaded,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
          injectedJavaScript={[
            console && INTEGRATIONS_SCRIPTS_CONSOLE,
            props.injectedJavaScript,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
          {...props}
        />
      );
    }),
    linkWebMethod<T>() {
      return WebMethod as {
        current: WebMethod<T>;
      };
    },
  };
};
