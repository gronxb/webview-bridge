import type { Bridge, BridgeStore, Primitive } from "@webview-bridge/types";
import { createEvents } from "@webview-bridge/util";
import React, {
  createRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { WebViewMessageEvent, WebViewProps } from "react-native-webview";
import WebView from "react-native-webview";

import {
  handleBridge,
  handleLog,
  INJECT_BRIDGE_METHODS,
  INJECT_BRIDGE_STATE,
  INJECT_DEBUG,
  LogType,
} from "./integrations";
import { handleRegisterWebMethod } from "./integrations/handleRegisterWebMethod";
import type { BridgeWebView } from "./types/webview";

export type CreateWebViewArgs<BridgeObject extends Bridge> = {
  bridge: BridgeStore<BridgeObject>;
  debug?: boolean;
  responseTimeout?: number;
  fallback?: (method: keyof BridgeObject) => void;
};

export type WebMethod<T> = T & {
  isReady: boolean;
};

export const createWebView = <BridgeObject extends Bridge>({
  bridge,
  debug,
  responseTimeout = 2000,
  fallback,
}: CreateWebViewArgs<BridgeObject>) => {
  const WebMethod = {
    current: {
      isReady: false,
    },
  };

  const _webviewRef = createRef<BridgeWebView>();
  const emitter = createEvents();

  bridge.subscribe((state) => {
    _webviewRef.current?.injectJavaScript(`
        window.nativeEmitter && window.nativeEmitter.emit('bridgeStateChange', ${JSON.stringify(
          state,
        )});
        true;
    `);
  });

  return {
    WebView: forwardRef<BridgeWebView, WebViewProps>((props, ref) => {
      const webviewRef = useRef<WebView>(null);

      const bridgeNames = useMemo(
        () =>
          Object.entries(bridge.getState() ?? {})
            .filter(([_, bridge]) => typeof bridge === "function")
            .map(([name]) => {
              return `'${name}'`;
            }),
        [],
      );

      const initialState = useMemo(
        () =>
          Object.fromEntries(
            Object.entries(bridge.getState() ?? {})
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              .filter(([_, value]) => typeof value !== "function"),
          ) as Record<string, Primitive>,
        [],
      );

      useImperativeHandle(ref, () => webviewRef.current as BridgeWebView, []);

      useImperativeHandle(
        _webviewRef,
        () => {
          return webviewRef.current as BridgeWebView;
        },
        [],
      );

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
              args: string;
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
          case "getBridgeState": {
            _webviewRef.current?.injectJavaScript(`
              window.nativeEmitter && window.nativeEmitterwindow.nativeEmitter.emit('bridgeStateChange', ${JSON.stringify(
                bridge.getState(),
              )});
              true;
            `);
            return;
          }
          case "registerWebMethod": {
            const { bridgeNames } = body as {
              bridgeNames: string[];
            };
            Object.assign(
              WebMethod.current,
              handleRegisterWebMethod(
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
          case "webMethodError": {
            const { eventId, funcName } = body as {
              eventId: string;
              funcName: string;
              value: unknown;
            };

            emitter.emit(`${funcName}-${eventId}`, {}, true);
            return;
          }
          case "fallback": {
            const { method } = body as {
              method: keyof BridgeObject;
            };
            fallback?.(method);
            return;
          }
        }
      };

      return (
        <WebView
          {...props}
          ref={webviewRef}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={[
            INJECT_BRIDGE_METHODS(bridgeNames),
            INJECT_BRIDGE_STATE(initialState),
            props.injectedJavaScriptBeforeContentLoaded,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
          injectedJavaScript={[
            console && INJECT_DEBUG,
            props.injectedJavaScript,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
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
