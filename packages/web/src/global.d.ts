import type { DefaultEmitter } from "@webview-bridge/utils";

import type { Primitive } from "./types";

// biome-ignore lint/complexity/noUselessEmptyExport: <explanation>
export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    __bridgeInitialState__?: Record<string, Primitive>;
    /**
     * @deprecated Use `nativeEmitterMap` instead.
     */
    nativeEmitter?: DefaultEmitter;
    nativeEmitterMap?: Record<string, DefaultEmitter>;
    nativeBatchedEvents?: [string, ...any][];
    webEmitter?: DefaultEmitter;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
