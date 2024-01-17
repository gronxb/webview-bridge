# Using React Native Methods in Web (loose)

This guide covers how to use native methods in a web environment without strict type safety. Sharing code between two projects that aren't part of a monorepo can be challenging. This method provides a way to develop without focusing on types.

::: tip NOTE
There is a way to export types to other projects using `dts-bundle-generator`.

**For detailed guides, visit:**   
Custom declaration file: [Exporting Type Declarations with a Custom Declaration File](https://gronxb.github.io/webview-bridge/exporting-type-declarations/custom-declaration-file.html)
:::

## React Native Part

Set up the bridge in React Native.

```ts
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

```
## Web Part
Declare `linkNativeMethod` and use it immediately with `.loose`.

Although it doesn't benefit from type assistance, it functions correctly at runtime.

```ts
import { linkNativeMethod } from "@webview-bridge/web";

const nativeMethod = linkNativeMethod();

nativeMethod.loose.getMessage().then((message) => console.log(message)); // Expecting "Hello, I'm native"
nativeMethod.loose.sum(1, 2).then((num) => console.log(num)); // Expecting 3

if (nativeMethod.isNativeMethodAvailable("openInAppBrowser")) {
    nativeMethod.loose.openInAppBrowser("https://google.com"); // Open Google in the native inAppBrowser
}
```