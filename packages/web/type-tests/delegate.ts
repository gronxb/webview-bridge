/**
 * Type-level tests for how the Web side sees `delegate()` methods.
 * Checked by `pnpm test:type`; every `@ts-expect-error` must stay an error.
 */
import type { BridgeStore, Delegated } from "@webview-bridge/types";
import { linkBridge } from "../src";

type User = { id: string };
type AppBridge = BridgeStore<{
  count: number;
  ping: () => Promise<string>;
  goBack: Delegated<() => Promise<void>>;
  getUser: Delegated<(id: string) => Promise<User | null>>;
}>;

const expectType = <T>(_value: T) => {};

const bridge = linkBridge<AppBridge>({
  // Plain implementations are accepted for delegated methods.
  initialBridge: {
    goBack: async () => {},
    getUser: async (id) => ({ id }),
  },
});

expectType<Promise<User | null>>(bridge.getUser("u1"));
expectType<Promise<void>>(bridge.goBack());
expectType<boolean>(bridge.isNativeMethodAvailable("getUser"));
// @ts-expect-error argument type comes from the delegate() signature
bridge.getUser(1);

linkBridge<AppBridge>({
  initialBridge: {
    // @ts-expect-error initialBridge implementations must match the signature
    getUser: async () => 1,
  },
});
