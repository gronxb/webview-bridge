import type {
  Bridge,
  BridgeStore,
  KeyOfOrString,
  Parser,
  ParserSchema,
  Primitive,
} from "@webview-bridge/types";
import { createEvents } from "@webview-bridge/util";
import React, {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { WebViewMessageEvent, WebViewProps } from "react-native-webview";
import WebView from "react-native-webview";

import {
  handleBridge,
  INJECT_BRIDGE_METHODS,
  INJECT_BRIDGE_STATE,
  SAFE_NATIVE_EMITTER_EMIT,
} from "./integrations/bridge";
import { handleLog, INJECT_DEBUG, LogType } from "./integrations/console";
import { handleRegisterWebMethod } from "./integrations/handleRegisterWebMethod";
import type { BridgeWebView } from "./types/webview";

export type CreateWebViewArgs<
  BridgeObject extends Bridge,
  PostMessageSchema extends ParserSchema<any>,
> = {
  bridge: BridgeStore<BridgeObject>;
  debug?: boolean;
  responseTimeout?: number;
  postMessageSchema?: PostMessageSchema;
  fallback?: (method: keyof BridgeObject) => void;
};

export type WebMethod<T> = T & {
  isReady: boolean;
};

export const createWebView = <
  BridgeObject extends Bridge,
  PostMessageSchema extends ParserSchema<any>,
>({
  bridge,
  debug,
  responseTimeout = 2000,
  postMessageSchema,
  fallback,
}: CreateWebViewArgs<BridgeObject, PostMessageSchema>) => {
  const WebMethod = {
    current: {
      isReady: false,
    },
  };

  const webviewRefList: React.RefObject<BridgeWebView>[] = [];
  const emitter = createEvents();

  bridge.subscribe((state) => {
    for (const ref of webviewRefList) {
      ref?.current?.injectJavaScript(
        SAFE_NATIVE_EMITTER_EMIT("bridgeStateChange", state),
      );
    }
  });

  return {
    postMessage: <
      EventName extends KeyOfOrString<PostMessageSchema>,
      Args extends Parser<PostMessageSchema, EventName>,
    >(
      eventName: EventName,
      args: Args,
    ) => {
      let _args = args;
      if (postMessageSchema) {
        _args = postMessageSchema[eventName].parse(args);
      }

      for (const ref of webviewRefList) {
        ref?.current?.injectJavaScript(
          SAFE_NATIVE_EMITTER_EMIT(`postMessage/${String(eventName)}`, _args),
        );
      }
    },
    WebView: forwardRef<BridgeWebView, WebViewProps>((props, ref) => {
      const webviewRef = useRef<WebView>(null);

      useLayoutEffect(() => {
        webviewRefList.push(webviewRef);
        return () => {
          webviewRefList.pop();
        };
      }, []);
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
            Object.entries(bridge.getState() ?? {}).filter(
              ([_, value]) => typeof value !== "function",
            ),
          ) as Record<string, Primitive>,
        [],
      );

      useImperativeHandle(ref, () => webviewRef.current as BridgeWebView, []);

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
            for (const ref of webviewRefList) {
              ref?.current?.injectJavaScript(
                SAFE_NATIVE_EMITTER_EMIT(
                  "bridgeStateChange",
                  bridge.getState(),
                ),
              );
            }
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
            debug && INJECT_DEBUG,
            props.injectedJavaScript,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
        />
      );
    }),
    /**
     * @deprecated Use `postMessage` instead.  And complete the type through the `postMessageSchema` option.
     * @see https://gronxb.github.io/webview-bridge/postMessage-native-to-web.html
     */
    linkWebMethod<T>() {
      return WebMethod as {
        current: WebMethod<T>;
      };
    },
  };
};
