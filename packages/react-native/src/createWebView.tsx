import { createEvents, createRandomId } from "@webview-bridge/util";
import {
  createRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import React from "react";
import type { WebViewMessageEvent, WebViewProps } from "react-native-webview";
import WebView from "react-native-webview";
import type { z } from "zod";

import {
  handleBridge,
  handleLog,
  INTEGRATIONS_SCRIPTS_BRIDGE,
  INTEGRATIONS_SCRIPTS_CONSOLE,
  LogType,
} from "./integrations";
import { handleRegisterWebMethod } from "./integrations/handleRegisterWebMethod";
import { BridgeSignature, EventBridge, MethodBridge } from "./types/bridge";
import type { BridgeWebView } from "./types/webview";

export type LinkBridge<
  BridgeObject extends MethodBridge,
  EventBridgeObject extends EventBridge,
> = BridgeObject | EventBridgeObject | [BridgeObject, EventBridgeObject];

export type CreateWebViewArgs<
  BridgeObject extends MethodBridge,
  EventBridgeObject extends EventBridge,
> = {
  bridge: LinkBridge<BridgeObject, EventBridgeObject>;
  debug?: boolean;
  responseTimeout?: number;
  fallback?: (method: Exclude<keyof BridgeObject, "__signature">) => void;
};

export type WebMethod<T> = T & {
  isReady: boolean;
};

export const createWebView = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BridgeObject extends MethodBridge<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EventBridgeObject extends EventBridge<any>,
>({
  bridge,
  debug,
  responseTimeout = 2000,
  fallback,
}: CreateWebViewArgs<BridgeObject, EventBridgeObject>) => {
  const findBridge = (
    bridge: LinkBridge<BridgeObject, EventBridgeObject>,
    signature: BridgeSignature,
  ) => {
    if (Array.isArray(bridge)) {
      const _bridge = bridge.find(
        (b) =>
          "__signature" in b &&
          typeof b.__signature === "string" &&
          b.__signature === signature,
      );
      if (!_bridge) {
        throw new Error(
          "The 'bridge' fields are incorrect. Did you use 'bridge' or 'eventBridge'?",
        );
      }
    }

    return bridge;
  };

  const WebMethod = {
    current: {
      isReady: false,
    },
  };

  const _webviewRef = createRef<BridgeWebView>();
  const emitter = createEvents();
  return {
    WebView: forwardRef<BridgeWebView, WebViewProps>((props, ref) => {
      const webviewRef = useRef<WebView>(null);

      const bridgeNames = useMemo(
        () =>
          Object.values(bridge ?? {}).map((func) => {
            return `'${func.name}'`;
          }),
        [],
      );

      useImperativeHandle(
        ref,
        () => {
          return webviewRef.current as BridgeWebView;
        },
        [],
      );

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

            const _bridge = findBridge(bridge, "methodBridge") as BridgeObject;
            handleBridge({
              bridge: _bridge,
              method,
              args,
              eventId,
              webview: webviewRef.current,
            });
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
              method: Exclude<keyof BridgeObject, "__signature">;
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
        />
      );
    }),
    linkWebMethod<T>() {
      return WebMethod as {
        current: WebMethod<T>;
      };
    },
    postMessage(
      eventName: Exclude<keyof EventBridgeObject, "__signature">,
      data: z.infer<
        EventBridgeObject[Exclude<keyof EventBridgeObject, "__signature">]
      >,
    ) {
      if (!_webviewRef.current) {
        throw new Error("postMessage is not ready");
      }
      const eventId = createRandomId();
      return _webviewRef.current.injectJavaScript(`
        window.webEmitter.emit('${String(
          eventName,
        )}', '${eventId}', ${JSON.stringify(data)});

        true;
        `);
    },
  };
};
