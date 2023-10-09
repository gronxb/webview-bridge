import { bridge, createWebView } from "@rnbridge/native";
import { InAppBrowser } from "react-native-inappbrowser-reborn";

export const appBridge = bridge({
  getMessage: () => {
    return "I'm from native" as const;
  },
  openInAppBrowser: async (url: string) => {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
});

export type AppBridge = typeof appBridge;

export const { WebView } = createWebView({
  bridge: appBridge,
  debug: true,
});
