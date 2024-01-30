import { type Bridge, bridge } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

export interface AppBridgeState extends Bridge {
  count: number;
  auth: {
    token: string;
  };

  increase(): Promise<void>;
  getBridgeVersion(): Promise<number>;
  getMessage(): Promise<string>;
  openInAppBrowser(url: string): Promise<void>;
}

export const appBridge = bridge<AppBridgeState>(({ get, set }) => ({
  // A bridge scenario that existed in the past. Assume the this method existed in a previous version.
  // async getBridgeVersion() {
  //   return 1;
  // },
  // async getOldVersionMessage() {
  //   return "I'm from native old version" as const;
  // },
  count: 0,
  auth: {
    token: "1234",
  },
  async increase() {
    const { count } = get();
    set({ count: count + 1 });
  },
  async setAuth(token: string) {
    set({ auth: { token } });
  },
  async getBridgeVersion() {
    return 2;
  },
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
}));

export type AppBridge = typeof appBridge;
