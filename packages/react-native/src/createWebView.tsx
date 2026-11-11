import type {
  AsyncFunction,
  Bridge,
  BridgeDelegate,
  BridgeStore,
  DelegatedMethodKeys,
  KeyOfOrString,
  ParserInput,
  ParserSchema,
} from "@webview-bridge/types";
import { createEvents, createRandomId } from "@webview-bridge/utils";
import type React from "react";
import {
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
  INJECT_BRIDGE_METHODS,
  INJECT_BRIDGE_STATE,
  SAFE_NATIVE_EMITTER_EMIT,
  SAFE_NATIVE_EMITTER_EMIT_BY_BRIDGE_ID,
  createHydrateData,
  getPrimitiveState,
  handleBridge,
} from "./integrations/bridge";
import { INJECT_DEBUG, type LogType, handleLog } from "./integrations/console";
import { handleRegisterWebMethod } from "./integrations/handleRegisterWebMethod";
import { parsePostMessage } from "./integrations/postMessageSchema";
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

/**
 * Extra props of the WebView created by `createWebView`.
 * `delegate` is required when the bridge declares `delegate()` methods.
 */
export type BridgeWebViewProps<BridgeObject extends Bridge> = [
  DelegatedMethodKeys<BridgeObject>,
] extends [never]
  ? {
      delegate?: never;
    }
  : {
      /**
       * Implementations for the methods declared with `delegate()`.
       * They run with this WebView's latest props, so they can use hooks and
       * context of the component that renders the WebView.
       *
       * Handlers that are missing when the WebView mounts are not exposed to
       * the page (`isNativeMethodAvailable` returns `false` for them).
       */
      delegate: BridgeDelegate<BridgeObject>;
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
  const uniqueId = createRandomId();

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
      Args extends ParserInput<PostMessageSchema, EventName>,
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
      let _args: unknown = args;
      if (postMessageSchema) {
        _args = parsePostMessage(
          postMessageSchema[eventName],
          String(eventName),
          args,
        );
      }
      if (options.broadcast) {
        for (const ref of webviewRefList) {
          ref?.current?.injectJavaScript(
            SAFE_NATIVE_EMITTER_EMIT(`postMessage/${String(eventName)}`, _args),
          );
        }
        return;
      }

      const lastRef = webviewRefList[webviewRefList.length - 1];
      lastRef?.current?.injectJavaScript(
        SAFE_NATIVE_EMITTER_EMIT(`postMessage/${String(eventName)}`, _args),
      );
    },
    WebView: forwardRef<
      BridgeWebView,
      WebViewProps & BridgeWebViewProps<BridgeObject>
    >((allProps, ref) => {
      const { delegate: delegateImpl, ...props } = allProps as WebViewProps & {
        delegate?: Partial<Record<string, AsyncFunction>>;
      };
      const webviewRef = useRef<WebView>(null);

      useLayoutEffect(() => {
        webviewRefList.push(webviewRef);
        return () => {
          const index = webviewRefList.indexOf(webviewRef);
          if (index !== -1) {
            webviewRefList.splice(index, 1);
          }
        };
      }, []);

      // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
      const initData = useMemo(
        () => createHydrateData(bridge, delegateImpl),
        [],
      );

      useEffect(() => {
        // lazy initialize the bridgeId
        webviewRef.current?.injectJavaScript(
          SAFE_NATIVE_EMITTER_EMIT("hydrate", initData),
        );
      }, [initData]);

      useImperativeHandle(ref, () => webviewRef.current as BridgeWebView, []);

      const handleMessage = async (event: WebViewMessageEvent) => {
        const { data, url } = event.nativeEvent;
        props.onMessage?.(event);

        if (!webviewRef.current) {
          return;
        }
        const { type, body, bridgeId } = JSON.parse(data);

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
              bridgeId,
              bridge,
              method,
              args,
              eventId,
              webview: webviewRef.current,
              url,
              delegate: delegateImpl,
            });
            return;
          }
          case "requestHydrate": {
            // The page ran linkBridge() before the injected bridge methods
            // were available (Android injects them asynchronously).
            webviewRef.current.injectJavaScript(
              SAFE_NATIVE_EMITTER_EMIT_BY_BRIDGE_ID(bridgeId, "hydrate", {
                // The method list is fixed at mount, like the injected one
                // (delegate() methods depend on the delegate prop at mount).
                bridgeMethods: initData.bridgeMethods,
                // The state is not: send the current one, or the page could
                // move back to the state from when the WebView mounted.
                nativeInitialState: getPrimitiveState(bridge),
              }),
            );
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
            INJECT_BRIDGE_STATE(initData.nativeInitialState),
            props.injectedJavaScriptBeforeContentLoaded,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
          injectedJavaScript={[
            debug && INJECT_DEBUG(uniqueId),
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
