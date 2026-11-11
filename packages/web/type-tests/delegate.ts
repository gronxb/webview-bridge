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

// ---- Standard Schema forms -------------------------------------------------
import type {
  InferSchemaInput,
  SchemaDelegated,
  StandardSchemaV1,
  ExtractStore as _ExtractStore,
} from "@webview-bridge/types";

type Schema<I, O> = StandardSchemaV1<I, O>;
type SchemaBridge = BridgeStore<{
  getUser: SchemaDelegated<
    Schema<{ id: string }, { id: number }>,
    Schema<{ name: string }, { name: string; upper: string }>
  >;
  track: SchemaDelegated<Schema<{ event: string }, { event: string }>>;
}>;

const schemaBridge = linkBridge<SchemaBridge>({
  initialBridge: {
    getUser: async () => ({ name: "web", upper: "WEB" }),
  },
});
expectType<Promise<{ name: string; upper: string }>>(
  schemaBridge.getUser({ id: "1" }),
);
expectType<Promise<unknown>>(schemaBridge.track({ event: "x" }));
// @ts-expect-error the page passes the input schema's input type
schemaBridge.getUser({ id: 1 });
expectType<{ id: string }>(
  null as unknown as InferSchemaInput<Schema<{ id: string }, { id: number }>>,
);

// postMessage listeners receive the Standard Schema output type.
type PostMessages = {
  converted: Schema<{ count: number }, { count: string }>;
  legacy: { validate: (data: unknown) => { legacy: true } };
};
const withEvents = linkBridge<SchemaBridge, PostMessages>();
withEvents.addEventListener("converted", (data) => {
  expectType<{ count: string }>(data);
});
withEvents.addEventListener("legacy", (data) => {
  expectType<{ legacy: true }>(data);
});
export type _Unused = _ExtractStore<SchemaBridge>;
