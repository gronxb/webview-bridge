# Monorepo Setup
In certain scenarios, you may manage a react-native project and a web project within the same monorepo.

A crucial aspect of `webview-bridge` is its ability to export types, facilitating seamless type sharing across different projects in the monorepo. This guide is tailored to demonstrate how you can efficiently move types from methods declared in the `React Native Project` to the `Web Project`, all within the unified structure of a monorepo.

There are many ways to export types, but here's one of them.

## Steps for Exporting Types

::: tip NOTE
The way types are shared is the same as `tRPC`. This is one of them, so you can export types the way you're used to.
:::

### 1. Override the 'types' Field in React Native Project's package.json:
Assuming the contents of `src/bridge.ts` are as follows:

```ts
// This file is src/bridge.ts
import { bridge } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

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
```


In your React Native project, here named `your-react-native-project`, redefine the types field in `package.json` to point to the location of your bridge file.
```json
{
  ...
  "name": "your-react-native-project",
  "types": "./src/bridge.ts", // This file is where the bridge file is defined.
  ...
}
```

### 2. Add Internal Package in the Web Project:
In your web project, add the React Native project as an internal package:
::: code-group

```sh [npm]
$ npm add your-react-native-project --save-dev
```

```sh [pnpm]
$ pnpm add your-react-native-project -D
```

```sh [yarn]
$ yarn add your-react-native-project --dev
```

:::

That's all there is to it! To export types from the Web Project to the React Native Project, simply reverse the process.




::: tip NOTE
You can explore a practical example and further understand the implementation by visiting the webview-bridge-example GitHub repository at https://github.com/gronxb/webview-bridge-example. This repository provides a hands-on demonstration of the concepts and steps outlined in this guide.
:::
