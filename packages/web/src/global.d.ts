import type { DefaultEvents, EventEmitter } from "@webview-bridge/util";

export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __bridgeInitialState__?: Record<string, any>;
    nativeEmitter?: EventEmitter<DefaultEvents>;
    nativeBatchedEvents?: [string, ...any][];
    webEmitter?: EventEmitter<DefaultEvents>;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
