import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
} from "@webview-bridge/types";

import { linkBridge, LinkBridgeOptions } from "./linkBridge";
import { LinkBridge } from "./types";

/**
 * @deprecated Use `linkBridge` instead. It's just renamed to `linkBridge`.
 */
export const linkNativeMethod = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BridgeStore<T extends Bridge ? T : any>,
>(
  options: LinkBridgeOptions<T> = {
    timeout: 2000,
    throwOnError: false,
  },
): LinkBridge<ExcludePrimitive<ExtractStore<T>>, T> => {
  return linkBridge(options);
};
