import type {
  Bridge,
  BridgeStore,
  ExcludePrimitive,
  ExtractStore,
  OnlyPrimitive,
} from "@webview-bridge/types";

import { linkBridge } from "./linkBridge";
import { LinkBridge } from "./types";

export interface LinkNativeMethodOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BridgeStore<T extends Bridge ? T : any>,
> {
  timeout?: number;
  throwOnError?: boolean | (keyof ExtractStore<T>)[] | string[];
  onFallback?: (methodName: string) => void;
  onReady?: (
    method: LinkBridge<
      ExcludePrimitive<ExtractStore<T>>,
      BridgeStore<OnlyPrimitive<ExtractStore<T>>>
    >,
  ) => void;
}

/**
 * @deprecated Use `linkBridge` instead. It's just renamed to `linkBridge`.
 */
export const linkNativeMethod = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BridgeStore<T extends Bridge ? T : any>,
>(
  options: LinkNativeMethodOptions<T> = {
    timeout: 2000,
    throwOnError: false,
  },
): LinkBridge<
  ExcludePrimitive<ExtractStore<T>>,
  BridgeStore<OnlyPrimitive<ExtractStore<T>>>
> => {
  return linkBridge(options);
};
