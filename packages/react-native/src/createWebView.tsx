import type {
  Bridge,
  BridgeStore,
  KeyOfOrString,
  Parser,
  ParserSchema,
  Primitive,
} from "@webview-bridge/types";
import { createEvents } from "@webview-bridge/utils";
import React, {
  forwardRef,
  useEffect,
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
  /**
   * The bridge object to be used in the WebView.
  * @example
    import { createWebView, bridge } from "@webview-bridge/react-native";
    import InAppBrowser from "react-native-inappbrowser-reborn";

    // Register functions in the bridge object in your React Native code
    export const appBridge = bridge({
      async getMessage() {
        return "Hello, I'm native";
      },
      async sum(a: number, b: number) {
        return a + b;
      },
      async openInAppBrowser(url: string) {
        if (await InAppBrowser.isAvailable()) {
          await InAppBrowser.open(url);
        }
      },
      // ... Add more functions as needed
    });

    export const { WebView } = createWebView({
      bridge: appBridge,
      debug: true, // Enable console.log visibility in the native WebView
    });
    */
  bridge: BridgeStore<BridgeObject>;
  /**
   * If `true`, the console.log visibility in the WebView is enabled.
   * @default false
   */
  debug?: boolean;
  /**
   * Set the timeout in milliseconds for the response from the web method.
   * @default 2000
   */
  responseTimeout?: number;
  /**
   * The schema for the postMessage method.
   * @link https://gronxb.github.io/webview-bridge/using-a-post-message.html
   */
  postMessageSchema?: PostMessageSchema;
  /**
   * Callback function when a method that is not defined in the bridge is called.
   * @link https://gronxb.github.io/webview-bridge/backward-compatibility/new-method.html#react-native-part
   */
  fallback?: (method: keyof BridgeObject) => void;
};

export type WebMethod<T> = T & {
  isReady: boolean;
};

/**
 * Create a WebView component that can communicate with the bridge.
 * @link https://gronxb.github.io/webview-bridge/getting-started.html
 * @example
    import { createWebView, bridge } from "@webview-bridge/react-native";
    import InAppBrowser from "react-native-inappbrowser-reborn";

    // Register functions in the bridge object in your React Native code
    export const appBridge = bridge({
      async getMessage() {
        return "Hello, I'm native";
      },
      async sum(a: number, b: number) {
        return a + b;
      },
      async openInAppBrowser(url: string) {
        if (await InAppBrowser.isAvailable()) {
          await InAppBrowser.open(url);
        }
      },
      // ... Add more functions as needed
    });

    export const { WebView } = createWebView({
      bridge: appBridge,
      debug: true, // Enable console.log visibility in the native WebView
    });
 */
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
    /**
     * Sends an event from React Native to the Web.
     * @link https://gronxb.github.io/webview-bridge/using-a-post-message.html
     */
    postMessage: <
      EventName extends KeyOfOrString<PostMessageSchema>,
      Args extends Parser<PostMessageSchema, EventName>,
    >(
      eventName: EventName,
      args: Args,
      options: {
        /**
         * If `true`, the message will be broadcasted to all webviews.
         * @default false
         */
        broadcast: boolean;
      } = {
        broadcast: false,
      },
    ) => {
      let _args: any = args;
      if (postMessageSchema) {
        _args = postMessageSchema[eventName].validate(args);
      }

      if (options.broadcast) {
        for (const ref of webviewRefList) {
          ref?.current?.injectJavaScript(
            SAFE_NATIVE_EMITTER_EMIT(`postMessage/${String(eventName)}`, _args),
          );
        }
      } else {
        const lastRef = webviewRefList[webviewRefList.length - 1];
        lastRef?.current?.injectJavaScript(
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

      const initData = useMemo(() => {
        const bridgeMethods = Object.entries(bridge.getState() ?? {})
          .filter(([_, bridge]) => typeof bridge === "function")
          .map(([name]) => name);
        const initialState = Object.fromEntries(
          Object.entries(bridge.getState() ?? {}).filter(
            ([_, value]) => typeof value !== "function",
          ),
        ) as Record<string, Primitive>;
        return { bridgeMethods, initialState };
      }, []);

      useEffect(() => {
        webviewRef.current?.injectJavaScript(
          SAFE_NATIVE_EMITTER_EMIT("hydrate", initData),
        );
      }, [initData]);

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
            INJECT_BRIDGE_METHODS(initData.bridgeMethods),
            INJECT_BRIDGE_STATE(initData.initialState),
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
     * @see https://gronxb.github.io/webview-bridge/using-a-post-message.html
     * @example 
      import { createWebView, postMessageSchema } from "@webview-bridge/react-native";
      import { z } from "zod";

      const appPostMessageSchema = postMessageSchema({
        eventName1: z.object({
          message: z.string(),
        }),
        eventName2: z.string(),
      });


      // Export the event schema to be used in the web application
      export type AppPostMessageSchema = typeof appPostMessageSchema;

      // When you bridge a webview, a postMessage is extracted.
      export const { postMessage } = createWebView({
        postMessageSchema: appPostMessageSchema, // Pass in the your schema. This is optional, so if the type doesn't matter to you, you don't need to include it.
        // ..
      });

      // usage
      postMessage("eventName1", {
        message: "test",
      });
      postMessage("eventName2", "test");
    */
    linkWebMethod<T>() {
      return WebMethod as {
        current: WebMethod<T>;
      };
    },
  };
};
