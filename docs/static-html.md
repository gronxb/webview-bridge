# Static HTML

In this guide, you’ll learn how to embed a web app directly into a React Native application without deploying it separately. you’ll bundle the web app into a single HTML file, convert it into a string, and display it in a WebView.

Example: [static-html](https://github.com/gronxb/webview-bridge/tree/main/example/static-html)

## Installation

### React Native Project

::: code-group

```sh [npm]
$ npm add @webview-bridge/react-native @webview-bridge/web react-native-webview
```

```sh [pnpm]
$ pnpm add @webview-bridge/react-native @webview-bridge/web react-native-webview
```

```sh [yarn]
$ yarn add @webview-bridge/react-native @webview-bridge/web react-native-webview
```

:::

## Creating the Web App - New Project

In your React Native project, run the following commands to set up a Vite project:

```sh
> pnpm create vite web
> cd web
> rm .gitignore eslint.config.js package.json tsconfig.json tsconfig.app.json # remove unused file
> mv vite.config.ts ../vite.config.ts
> pnpm add vite -D
> pnpm add react react-dom # (Optional) Other frameworks can be used as well.
```

Move `vite.config.ts` from the web folder to the parent React Native project. Since you deleted `package.json`, you may need to install core libraries like `react` or `react-dom`.

## vite.config.ts

You use `vite-plugin-singlefile` to bundle everything into a single HTML file and `vite-plugin-html-stringify` to convert the HTML into exportable code.

- [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)
- [vite-plugin-html-stringify](https://github.com/gronxb/vite-plugin-html-stringify)

::: code-group

```sh [npm]
$ npm add vite-plugin-singlefile vite-plugin-html-stringify -D
```

```sh [pnpm]
$ pnpm add vite-plugin-singlefile vite-plugin-html-stringify -D
```

```sh [yarn]
$ yarn add vite-plugin-singlefile vite-plugin-html-stringify -D
```

:::

::: warning WARN
Q. Why do you export static HTML as a string again?

A. You cannot properly load static HTML with require in react-native-webview.

Please refer to the following issue: [react-native-webview#746](https://github.com/react-native-webview/react-native-webview/issues/746#issuecomment-516350019)
:::

```tsx
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { viteHtmlStringify } from "vite-plugin-html-stringify";

export default defineConfig({
  root: "./web",
  plugins: [
    react(),
    viteSingleFile({
      deleteInlinedFiles: true,
      removeViteModuleLoader: true,
    }),
    viteHtmlStringify({
      output: "./web/html.ts",
    }),
  ],
});
```

## package.json

```json
{
  "scripts": {
    // ...
    "build:web": "vite build",
    "dev:web": "vite"
  }
}
```

## Setting Up the Bridge

### React Native Part

```tsx
// src/bridge.ts
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

export type AppBridge = typeof appBridge;
```

Create a WebView Component by combining the previously defined `bridge` with `createWebView`.

```tsx
// src/App.tsx
import html from "../web/html"; // Generated HTML
import { appBridge } from "./bridge";

export const { WebView } = createWebView({
  bridge: appBridge,
  debug: true, // Enable console.log visibility in the native WebView
});

// Use the WebView component in your app
function App(): JSX.Element {
  return (
    <SafeAreaView style={{ height: "100%" }}>
      <WebView
        source={
          __DEV
            ? {
                uri: "http://localhost:5173",
              }
            : {
                html, // Use the built HTML in production
              }
        }
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </SafeAreaView>
  );
}

export default App;
```

::: tip NOTE
When running in development mode, you can take advantage of HMR (Hot Module Replacement) for development. Before deployment, you need to generate `html.ts` using the build:web command in your CI configuration.
:::

```tsx
// src/App.tsx
import html from "../web/html"; // generate html;
import { appBridge } from "./bridge";

export const { WebView } = createWebView({
  bridge: appBridge,
  debug: true, // Enable console.log visibility in the native WebView
});

// Use the WebView component in your app
function App(): JSX.Element {
  return (
    <SafeAreaView style={{ height: "100%" }}>
      <WebView
        source={
          __DEV
            ? {
                uri: "http://localhost:5173",
              }
            : {
                html, // production일 때 빌드 된 html로 작동
              }
        }
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </SafeAreaView>
  );
}

export default App;
```

### Web Part

Now, let's setting up the web project that will be displayed in the WebView.
Utilize the previously exported `AppBridge` as a generic in `linkBridge`.

That's all there is to it!

You can directly use `bridge` as shown below and receive the results.

```tsx
// web/bridge.ts
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "../src/bridge.ts";

const bridge = linkBridge<AppBridge>({
  onReady: async (method) => {
    console.log("bridge is ready");
    const version = await method.getBridgeVersion();
    console.log("currentBridgerVersion", version);
  },
});

bridge.getMessage().then((message) => console.log(message)); // Expecting "Hello, I'm native"
bridge.sum(1, 2).then((num) => console.log(num)); // Expecting 3
bridge.openInAppBrowser("https://google.com"); // Open google in the native inAppBrowser
```
