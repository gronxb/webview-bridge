import type { DefaultEmitter } from "../../utils/dist";

import { Primitive } from ".";

export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    __bridgeInitialState__?: Record<string, Primitive>;
    nativeEmitter?: DefaultEmitter;
    nativeBatchedEvents?: [string, ...any][];
    webEmitter?: DefaultEmitter;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
