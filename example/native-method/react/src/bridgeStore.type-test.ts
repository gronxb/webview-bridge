import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-native-method/react-native/types";

type Assert<T extends true> = T;
type LinkedAppBridge = ReturnType<typeof linkBridge<AppBridge>>;

export type BridgeStoreDoesNotExposeNativeMiddleware = Assert<
  "use" extends keyof LinkedAppBridge["store"] ? false : true
>;
