# Getting Started

## Installation

### React Native Project

::: code-group

```sh [npm]
$ npm add -D @webview-bridge/react-native react-native-webview
```

```sh [pnpm]
$ pnpm add -D @webview-bridge/react-native react-native-webview
```

```sh [yarn]
$ yarn add -D @webview-bridge/react-native react-native-webview
```

:::

### Web Project

::: code-group

```sh [npm]
$ npm add -D @webview-bridge/web
```

```sh [pnpm]
$ pnpm add -D @webview-bridge/web
```

```sh [yarn]
$ yarn add -D @webview-bridge/web
```

:::

## Using a Native Method

This guide covers how to use methods declared in React Native within a web.

### React Native Part

Register functions in the bridge object in your React Native code

::: warning IMPORTANT
You need to export the created `typeof appBridge` and share its type with the web project. Failing to do so will result in a lack of type safety. This principle is similar to how `tRPC` operates.

**For detailed guides, visit:**   
Monorepo setup: [Exporting Type Declarations in a Monorepo](https://gronxb.github.io/webview-bridge/exporting-type-declarations/monorepo.html)  
Custom declaration file: [Exporting Type Declarations with a Custom Declaration File](https://gronxb.github.io/webview-bridge/exporting-type-declarations/custom-declaration-file.html)
:::

```tsx
import { createWebView, bridge } from "@webview-bridge/react-native";

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

// Export the bridge type to be used in the web application
export type AppBridge = typeof appBridge;
```

Create a WebView Component by combining the previously defined `bridge` with `createWebView`.

::: tip NOTE
The WebView created through `createWebView` is identical to the typical react-native-webview.
:::

```tsx
export const { WebView } = createWebView({
  bridge: appBridge,
  debug: true, // Enable console.log visibility in the native WebView
});

// Use the WebView component in your app
function App(): JSX.Element {
  return (
    <SafeAreaView style={{ height: "100%" }}>
      <WebView
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </SafeAreaView>
  );
}

export default App;
```

### Web Part

Now, let's setting up the web project that will be displayed in the WebView.
Utilize the previously exported `AppBridge` as a generic in `linkNativeMethod`.

That's all there is to it!

You can directly use `nativeMethod` as shown below and receive the results.

```tsx
import { linkNativeMethod } from "@webview-bridge/web";
import type { AppBridge } from ""; // Import the type 'appBridge' declared in native

const nativeMethod = linkNativeMethod<AppBridge>({
  onReady: async (method) => {
    console.log("nativeMethod is ready");
    const version = await method.getBridgeVersion();
    console.log("currentBridgerVersion", version);
  },
});

nativeMethod.getMessage().then((message) => console.log(message)); // Expecting "Hello, I'm native"
nativeMethod.sum(1, 2).then((num) => console.log(num)); // Expecting 3
nativeMethod.openInAppBrowser("https://google.com"); // Open google in the native inAppBrowser
```


### Checking WebView Bridge Availability

You can also check for the availability of specific methods using `isNativeMethodAvailable`.

This allows you to safely execute methods only when they are available. Here's how you can implement this:

```tsx
if (nativeMethod.isNativeMethodAvailable("openInAppBrowser")) {
    nativeMethod.openInAppBrowser();
} else {
    console.warn("openInAppBrowser method not supported");
}
```

In addition, to check the general availability of the WebView bridge, you can use `isWebViewBridgeAvailable`:

```tsx
if (nativeMethod.isWebViewBridgeAvailable) {
    nativeMethod.openInAppBrowser();
} else {
    console.warn("native method not supported")
}
```

