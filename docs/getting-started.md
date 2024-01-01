# Getting Started


## Installation

### React Native Project
::: code-group

```sh [npm]
$ npm add -D @rnbridge/native react-native-webview
```

```sh [pnpm]
$ pnpm add -D @rnbridge/native react-native-webview
```

```sh [yarn]
$ yarn add -D @rnbridge/native react-native-webview
```

:::

### Web Project
::: code-group

```sh [npm]
$ npm add -D @rnbridge/web
```

```sh [pnpm]
$ pnpm add -D @rnbridge/web
```

```sh [yarn]
$ yarn add -D @rnbridge/web
```

:::

## Using React Native Methods in Web
### React Native Part

Register functions in the bridge object in your React Native code

```tsx
import { createWebView } from "@rnbridge/native";
import { bridge } from "@rnbridge/native";

// Register functions in the bridge object in your React Native code
export const appBridge = bridge({
  getMessage: () => {
    return "Hello, I'm native";
  },
  sum: (a: number, b: number) => {
    return a + b;
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
import { linkNativeMethod } from "@rnbridge/web";
import type { AppBridge } from ""; // Import the type 'appBridge' declared in native

const nativeMethod = linkNativeMethod<AppBridge>();

nativeMethod.getMessage().then((message) => console.log(message)); // Expecting "Hello, I'm native"
nativeMethod.sum(1, 2).then((num) => console.log(num)); // Expecting 3
```
### Using Web Methods in React Native
* Web

```tsx
import { linkNativeMethod, registerWebMethod } from "@rnbridge/web";

// Register functions in the registerWebMethod object in your web code
export const webBridge = registerWebMethod({
  alert: (message: string) => {
    window.alert(message);
  },
  sum: (a: number, b: number) => {
    return a + b;
  },
  // ... Add more functions as needed
});

// Export the bridge type to be used in the web application
export type WebBridge = typeof webBridge;
```

* React Native
```tsx
// When you bridge a webview, a linkWebMethod is extracted.
export const { linkWebMethod } = createWebView({
  // .. 
});

const WebMethod = linkWebMethod<WebBridge>();


// When the value of the WebMethod is binding, it is checked with isReady and executed.
if (WebMethod.current.isReady) {
  WebMethod.current.alert("This called from webview");
}

if (WebMethod.current.isReady) {
  WebMethod.current.sum(1, 2).then((result) => setValue(result));
}
```