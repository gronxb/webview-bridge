/**
 * Type-level tests for `delegate()` and the `delegate` prop.
 * Checked by `pnpm test:type`; every `@ts-expect-error` must stay an error.
 */
import type { BridgeDelegate, DelegatedMethodKeys } from "../src";
import { bridge, createWebView, delegate } from "../src";

type User = { id: string };

const appBridge = bridge({
  count: 0,
  async openInAppBrowser(_url: string) {},
  goBack: delegate<() => Promise<void>>(),
  getUser: delegate<(id: string) => Promise<User | null>>(),
});

const { WebView } = createWebView({ bridge: appBridge });

const expectType = <T,>(_value: T) => {};

// Only delegate() methods are handler keys, from the store or its state type.
expectType<"goBack" | "getUser">(
  null as unknown as DelegatedMethodKeys<typeof appBridge>,
);
expectType<DelegatedMethodKeys<typeof appBridge>>(
  null as unknown as DelegatedMethodKeys<ReturnType<typeof appBridge.getState>>,
);

export const ok = (
  <WebView
    delegate={{
      goBack: async () => {},
      getUser: async (id) => {
        expectType<string>(id);
        return { id };
      },
    }}
  />
);

// @ts-expect-error delegate is required when the bridge has delegate() methods
export const missingProp = <WebView />;

export const missingHandler = (
  // @ts-expect-error getUser is missing
  <WebView delegate={{ goBack: async () => {} }} />
);

export const extraHandler = (
  <WebView
    delegate={{
      goBack: async () => {},
      getUser: async () => null,
      // @ts-expect-error only delegate() methods can be handled per WebView
      openInAppBrowser: async () => {},
    }}
  />
);

export const wrongReturn = (
  <WebView
    delegate={{
      goBack: async () => {},
      // @ts-expect-error return type must match the declared signature
      getUser: async () => 1,
    }}
  />
);

// The delegated method keeps its declared signature on the bridge type,
// which is what the Web side reads through `typeof appBridge`.
expectType<(id: string) => Promise<User | null>>(appBridge.getState().getUser);

export const handlers: BridgeDelegate<typeof appBridge> = {
  goBack: async () => {},
  getUser: async () => null,
};

// Bridges without delegate() methods do not take delegate.
const plainBridge = bridge({ async ping() {} });
const { WebView: PlainWebView } = createWebView({ bridge: plainBridge });
export const plain = <PlainWebView />;
// @ts-expect-error nothing to delegate
export const plainWithHandlers = <PlainWebView delegate={{}} />;

// Existing bridges with `any`-typed members must not start requiring delegate.
const anyMemberBridge = bridge({ data: null as any, async ping() {} });
const { WebView: AnyMemberWebView } = createWebView({
  bridge: anyMemberBridge,
});
export const anyMember = <AnyMemberWebView />;

const { WebView: AnyBridgeWebView } = createWebView({ bridge: null as any });
export const anyBridge = <AnyBridgeWebView />;

// Optional members must not make `delegate` required either.
const optionalMemberBridge = bridge<{
  label?: string;
  ping: () => Promise<void>;
}>({ async ping() {} });
const { WebView: OptionalMemberWebView } = createWebView({
  bridge: optionalMemberBridge,
});
export const optionalMember = <OptionalMemberWebView />;
