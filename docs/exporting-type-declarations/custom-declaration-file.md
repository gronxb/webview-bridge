# Custom Declaration File Setup
In some scenarios, you may have a react-native project and a web project as separate repositories.

Exporting types is a key part of `webview-bridge`, so here's a guide to sharing types across different projects.
This guide is for moving types from methods declared in the `React Native Project` to the `Web Project`.
  
## Steps for Exporting Types
### 1. Installing dts-bundle-generator:
::: tip NOTE
For more information and additional details, please visit the dts-bundle-generator GitHub repository at https://github.com/timocov/dts-bundle-generator.
:::

To start, you'll need to add dts-bundle-generator to your project. This is done using the following command:
::: code-group

```sh [npm]
$ npm add dts-bundle-generator --save-dev
```

```sh [pnpm]
$ pnpm add dts-bundle-generator -D
```

```sh [yarn]
$ yarn add dts-bundle-generator --dev
```

:::

### 2. Creating the Build Configuration File:
Next, create a `tsconfig.build.json` file with the necessary compiler options:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "esModuleInterop": true,
    "lib": ["ES6"],
    // You should also put in the `jsx`, `paths` fields if you want.
  }
}
```
### 3. Redefining Bridge Functions:
Define your bridge functions in a separate file for clarity and organization. For example, create a `src/bridge.ts` file:

```ts
// This file is src/bridge.ts
import { bridge } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

export const appBridge = bridge({
  getMessage: async () => {
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

### 4. Generating Type Definitions:
Use `dts-bundle-generator` to create your type definitions file:

::: code-group

```sh [npm]
$ npm dts-bundle-generator -o output.ts src/bridge.ts --project=tsconfig.build.json --no-check
```

```sh [pnpm]
$ pnpm dts-bundle-generator -o output.ts src/bridge.ts --project=tsconfig.build.json --no-check
```

```sh [yarn]
$ yarn dts-bundle-generator -o output.ts src/bridge.ts  --project=tsconfig.build.json --no-check
```

:::

### 5. Copying the Type Definitions File:
Once you have generated output.ts, copy this file to your web project.

### 6. Importing in the Web Project:
In your web project, import the types as shown below:

```ts
import { AppBridge } from "./output";

const nativeMethod = linkNativeMethod<AppBridge>();
```

By following these steps, you ensure that type consistency and interoperability are maintained across your React Native and web projects, even when they are housed in multi repositories.