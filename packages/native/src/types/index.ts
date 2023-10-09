import { Component } from "react";
import WebView, { WebViewProps } from "react-native-webview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Procedure = (...args: any[]) => any;

export type ProceduresObject<T extends Record<string, Procedure>> = {
  [K in keyof T]: (
    ...args: Parameters<T[K]>
  ) => Promise<Awaited<ReturnType<T[K]>>>;
};

export type Bridge = <T extends Record<string, Procedure>>(
  procedures: T,
) => ProceduresObject<T>;

export type WebViewMethod = Pick<
  WebView,
  Exclude<keyof WebView, keyof Component<WebViewProps>>
>;

export type RNBridgeWebView<T = unknown> = WebViewMethod &
  T & { isReady: boolean };
