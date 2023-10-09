import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import React from "react";
import type { WebViewProps } from "react-native-webview";
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

export type CreateWebViewArgs = {
  bridge: ProceduresObject<Record<string, Procedure>>;
  debug?: boolean;
};

export const createWebView = ({ bridge, debug }: CreateWebViewArgs) => {
  return {
    WebView: forwardRef<RNBridgeWebView, WebViewProps>((props, ref) => {
      const webviewRef = useRef<WebView>(null);
      const methodRef = useRef({});
      const [isWebMethodLoaded, setIsWebMethodLoaded] = React.useState(false);

      const bridgeNames = useMemo(
        () =>
          Object.values(bridge ?? {}).map((func) => {
            return `'${func.name}'`;
          }),
        [],
      );

      useImperativeHandle(
        ref,
        () =>
          ({
            ...webviewRef.current,
            ...methodRef.current,
            isReady: isWebMethodLoaded,
          }) as RNBridgeWebView,
        [isWebMethodLoaded],
      );

      return (
        <WebView
          ref={webviewRef}
          onMessage={async (event) => {
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

                methodRef.current = handleCreateWebMethod(
                  webviewRef.current,
                  bridgeNames,
                );
                setIsWebMethodLoaded(true);

                return;
              }
            }
          }}
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
  };
};
