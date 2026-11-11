/**
 * Type-level tests for `delegate()` and the `bridgeHandlers` prop.
 * Checked by `pnpm test:type`; every `@ts-expect-error` must stay an error.
 */
import type { BridgeHandlers, DelegatedMethodKeys } from "../src";
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
    bridgeHandlers={{
      goBack: async () => {},
      getUser: async (id) => {
        expectType<string>(id);
        return { id };
      },
    }}
  />
);

// @ts-expect-error bridgeHandlers is required when the bridge has delegate() methods
export const missingProp = <WebView />;

export const missingHandler = (
  // @ts-expect-error getUser is missing
  <WebView bridgeHandlers={{ goBack: async () => {} }} />
);

export const extraHandler = (
  <WebView
    bridgeHandlers={{
      goBack: async () => {},
      getUser: async () => null,
      // @ts-expect-error only delegate() methods can be handled per WebView
      openInAppBrowser: async () => {},
    }}
  />
);

export const wrongReturn = (
  <WebView
    bridgeHandlers={{
      goBack: async () => {},
      // @ts-expect-error return type must match the declared signature
      getUser: async () => 1,
    }}
  />
);

// The delegated method keeps its declared signature on the bridge type,
// which is what the Web side reads through `typeof appBridge`.
expectType<(id: string) => Promise<User | null>>(appBridge.getState().getUser);

export const handlers: BridgeHandlers<typeof appBridge> = {
  goBack: async () => {},
  getUser: async () => null,
};

// Bridges without delegate() methods do not take bridgeHandlers.
const plainBridge = bridge({ async ping() {} });
const { WebView: PlainWebView } = createWebView({ bridge: plainBridge });
export const plain = <PlainWebView />;
// @ts-expect-error nothing to delegate
export const plainWithHandlers = <PlainWebView bridgeHandlers={{}} />;
