import type { DefaultEvents, EventEmitter } from "@webview-bridge/util";

export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    __bridgeInitialState__?: Record<string, any>;
    nativeEmitter?: EventEmitter<DefaultEvents>;
    nativeBatchedEvents?: [string, ...any][];
    webEmitter?: EventEmitter<DefaultEvents>;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
