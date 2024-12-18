# Non-React Native Environment

Although the app is webview-based, there may be times when it needs to be accessible purely through the web, without relying solely on the WebView.
This guide helps you to mock the bridge, allowing it to function correctly even when accessed only through the web.

::: tip NOTE
In the case of an SSR (Server-Side Rendering) environment, it also assists in the hydration process.
:::

### initialBridge

It is possible to configure `initialBridge` to operate in a non-React Native environment.
Prioritize applying the bridge of the React Native WebView, and if it is unavailable, apply the `initialBridge`.
Therefore, if `initialBridge` is configured, `bridge.isWebViewBridgeAvailable` should be true even in environments that are not React Native.

```ts
import { linkBridge } from "@webview-bridge/web";

// Here Custom Type
export interface BridgeState extends Bridge {
  token: string;
  setToken: (token: string) => Promise<void>;
  getMessage: () => Promise<"I'm from native">;
  openInAppBrowser: (url: string) => Promise<void>;
} 

export type AppBridge = BridgeStore<BridgeState>;


export const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  initialBridge: {
    token: '',
    setToken: async (token) => {
      alert('This feature is only available in a WebView environment.');
    },
    getMessage: async () => "I'm from native",
    openInAppBrowser: async (url) => {
      alert('This feature is only available in a WebView environment.');
    }
  },
  onReady: () => {
    console.log("bridge is ready");
  },
});
```
