import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  ParserSchema,
} from "@webview-bridge/types";

import { linkBridge, LinkBridgeOptions } from "./linkBridge";
import { LinkBridge } from "./types";

/**
 * @deprecated Use `linkBridge` instead. It's just renamed to `linkBridge`.
 */
export const linkNativeMethod = <
  T extends BridgeStore<T extends Bridge ? T : any>,
  V extends ParserSchema<any>,
>(
  options: LinkBridgeOptions<T, V> = {
    timeout: 2000,
    throwOnError: false,
  },
): LinkBridge<ExcludePrimitive<ExtractStore<T>>, Omit<T, "setState">, V> => {
  return linkBridge(options);
};
