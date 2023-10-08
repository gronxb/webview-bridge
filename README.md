# rnbridge

[![NPM](https://img.shields.io/npm/v/@rnbridge/native)](https://www.npmjs.com/package/@rnbridge/native)

rnbridge is a developer-friendly webview interface that acts as a bridge between React Native and web applications. It offers seamless communication between these platforms and provides a type-safe environment.

Inspired by the functionality of `tRPC`, rnbridge simplifies the communication process between `react-native-webview` and web applications.

![rnbridge](https://github.com/gronxb/rnbridge/assets/41789633/02cd8d69-6d93-4cac-8b2b-75b637c54bc7)


## Installation

### React Native Project

```sh
$ pnpm add @rnbridge/native react-native-webview
```

### Web Project

```sh
$ pnpm add @rnbridge/browser
```

## Getting Started

### React Native

```tsx
import { createWebview } from "@rnbridge/native";
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

export const { Webview } = createWebview({
  bridge: appBridge,
  host: "http://localhost:5173", // webview host
  debug: true, // Enable console.log visibility in the native webview
});

// Use the Webview component in your app
function App(): JSX.Element {
  return (
    <SafeAreaView style={{ height: "100%" }}>
      <Webview style={{ height: "100%", width: "100%" }} />
    </SafeAreaView>
  );
}

export default App;
```

### Web

```tsx
import { createBridge } from "@rnbridge/web";
import type { AppBridge } from ""; // Import the type 'appBridge' declared in native

const bridge = createBridge<AppBridge>();

bridge.getMessage().then((message) => console.log(message)); // Expecting "Hello, I'm native"
bridge.sum(1, 2).then((num) => console.log(num)); // Expecting 3
```

## Type Export Guide

For a better experience with rnbridge, it is recommended to export the type declaration of the native `bridge` object to the web application.

There are a few ways to achieve this:

1. Use a monorepo setup to export the type of the native `bridge`. **(recommended)**
2. Utilize a private npm registry to export the type of the native `bridge`.
3. Build a bridge declaration file using tsc and move the file as needed.
   (Note: WIP)

## Contributor Guide

If you would like to contribute to rnbridge by submitting bug fixes or performance improvements, please refer to our [CONTRIBUTING.md](https://github.com/brandazine/rnbridge/blob/main/CONTRIBUTING.md) guide for detailed instructions. We welcome and appreciate your contributions.
