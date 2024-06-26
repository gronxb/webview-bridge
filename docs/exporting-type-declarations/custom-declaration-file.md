# Custom Declaration File Setup
In some scenarios, you may have a react-native project and a web project as separate repositories.

Exporting types is a key part of `webview-bridge`, so here's a guide to sharing types across different projects.
This guide is for shard types from methods declared in the `React Native Project` to the `Web Project`.
  
In cases where it is not a monorepo, you need to declare types twice in each repository. However, if there are not many methods, this approach can be fast and efficient.

## Steps for Exporting Types

### 1. Redefining Bridge Functions:
Define your bridge functions in a separate file for clarity and organization. For example, create a `src/bridge.ts` file:

```ts
// This file is src/bridge.ts
import { bridge, type Bridge } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

// Here Custom Type
export interface BridgeState extends Bridge {
  token: string;
  setToken: (token: string) => Promise<void>;
  getMessage: () => Promise<"I'm from native">;
  openInAppBrowser: (url: string) => Promise<void>;
} 

export const appBridge = bridge<Bridge>(({ get, set }) => ({
  token: '',
  async setToken(token) {
    set({
      token,
    })
  },
  async getMessage() {
    return "I'm from native";
  },
  async openInAppBrowser(url) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
}));
```

### 2. Importing in the Web Project:
In your web project, import the types as shown below:

```ts
import { type Bridge, type BridgeStore, linkBridge } from '@webview-bridge/web';

// Here Custom Type
export interface BridgeState extends Bridge {
  token: string;
  setToken: (token: string) => Promise<void>;
  getMessage: () => Promise<"I'm from native">;
  openInAppBrowser: (url: string) => Promise<void>;
} 

export type AppBridge = BridgeStore<BridgeState>;

const bridge = linkBridge<AppBridge>();
```

By following these steps, you ensure that type consistency and interoperability are maintained across your React Native and web projects, even when they are housed in multi repositories.