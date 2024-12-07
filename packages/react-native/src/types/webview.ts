import type { Component } from "react";
import type WebView from "react-native-webview";
import type { WebViewProps } from "react-native-webview";

export type BridgeWebView = Pick<
  WebView,
  Exclude<keyof WebView, keyof Component<WebViewProps>>
>;
