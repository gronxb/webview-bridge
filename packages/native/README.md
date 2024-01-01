# rnbridge

[![NPM](https://img.shields.io/npm/v/%40rnbridge%2Fnative/latest?label=%40rnbridge%2Fnative)](https://www.npmjs.com/package/@rnbridge/native)
[![NPM](https://img.shields.io/npm/v/%40rnbridge%2Fweb/latest?label=%40rnbridge%2Fweb)](https://www.npmjs.com/package/@rnbridge/web)

`rnbridge` is a powerful interface that acts as a bridge between React Native and web applications using `react-native-webview`. It providing seamless interaction and ensuring type safety.

Inspired by the functionality of `tRPC`, `rnbridge` simplifies the communication process between `react-native-webview` and web applications.

**Key Features:**
- Built upon `react-native-webview`.
- Designed with zero external dependencies (except for `react-native-webview`).
- Type-Safety

![rnbridge](https://github.com/gronxb/rnbridge/assets/41789633/02cd8d69-6d93-4cac-8b2b-75b637c54bc7)


## Installation

### React Native Project
```sh
# Using pnpm:
$ pnpm add @rnbridge/native react-native-webview

# Using yarn:
$ yarn add @rnbridge/native react-native-webview

# Using npm:
$ npm install @rnbridge/native react-native-webview
```
### Web Project

```sh
# Using pnpm:
$ pnpm add @rnbridge/web

# Using yarn:
$ yarn add @rnbridge/web

# Using npm:
$ npm install @rnbridge/web
```

## Getting Started
### Using React Native Methods in Web
* React Native

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
* Web
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
import { linkNativeMethod, createWebMethod } from "@rnbridge/web";

// Register functions in the createWebMethod object in your web code
export const webBridge = createWebMethod({
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

## Exporting Type Declarations
To enhance your experience with rnbridge, it's recommended to export the type declaration of the native bridge object to the web application. Here are a few ways to achieve this:

1. Monorepo Setup (Recommended): Use a monorepo setup to export the type of the native bridge.
2. Private npm Registry: Utilize a private npm registry to export the type of the native bridge.
3. Custom Declaration File (WIP): Build a bridge declaration file using tsc and move the file as needed.


## Contributor Guide

If you would like to contribute to rnbridge by submitting bug fixes or performance improvements, please refer to our [CONTRIBUTING.md](https://github.com/brandazine/rnbridge/blob/main/CONTRIBUTING.md) guide for detailed instructions. We welcome and appreciate your contributions.
