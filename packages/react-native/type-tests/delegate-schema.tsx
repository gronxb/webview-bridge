/**
 * Type-level tests for `delegate(input, output?)` with Standard Schemas and for
 * Standard Schema `postMessageSchema` events. Checked by `pnpm test:type`.
 */
import * as v from "valibot";
import { z } from "zod";
import type { BridgeDelegate, ParserInput } from "../src";
import { bridge, createWebView, delegate, postMessageSchema } from "../src";

const expectType = <T,>(_value: T) => {};

const userSchema = z.object({ id: z.number(), name: z.string() });

const appBridge = bridge({
  goBack: delegate(),
  // Input transforms: the page sends a string, the implementation gets a number.
  getUser: delegate(
    z.object({ id: z.string().transform((value) => Number(value)) }),
    userSchema,
  ),
  // Input only: the page gets `unknown` back.
  track: delegate(v.object({ event: v.string() })),
  // Optional input (`void`): callable without an argument.
  refresh: delegate(z.void(), z.boolean()),
  // The generic form still works.
  confirm: delegate<(message: string) => Promise<boolean>>(),
});
type AppState = ReturnType<typeof appBridge.getState>;

// Web-side signatures: schema *input* in, output schema *output* out.
declare const state: AppState;
expectType<Promise<void>>(state.goBack());
expectType<Promise<{ id: number; name: string }>>(state.getUser({ id: "1" }));
expectType<Promise<unknown>>(state.track({ event: "open" }));
expectType<Promise<boolean>>(state.refresh());
expectType<Promise<boolean>>(state.confirm("ok?"));
// @ts-expect-error the page sends the input type (string), not the output type
state.getUser({ id: 1 });
// @ts-expect-error input is required when the schema does not accept undefined
state.getUser();

// Native implementations: schema *output* in, output schema *input* out.
export const handlers: BridgeDelegate<typeof appBridge> = {
  goBack: async () => {},
  getUser: async ({ id }) => {
    expectType<number>(id);
    return { id, name: "a" };
  },
  track: ({ event }) => {
    expectType<string>(event);
  },
  refresh: () => true,
  confirm: async () => true,
};

const { WebView } = createWebView({ bridge: appBridge });
export const ok = <WebView delegate={handlers} />;

export const wrongOutput = (
  <WebView
    delegate={{
      ...handlers,
      // @ts-expect-error the implementation must return the output schema's input
      getUser: async () => ({ id: "1", name: "a" }),
    }}
  />
);

// @ts-expect-error every delegate() method must be implemented
export const missing = <WebView delegate={{ goBack: async () => {} }} />;

// postMessageSchema accepts Standard Schemas next to `{ validate }` objects.
const schema = postMessageSchema({
  zodEvent: z.object({ count: z.number().transform(String) }),
  valibotEvent: v.object({ message: v.string() }),
  legacyEvent: { validate: (data: unknown) => data as { legacy: true } },
});
type Schema = typeof schema;
expectType<{ count: number }>(
  null as unknown as ParserInput<Schema, "zodEvent">,
);
expectType<{ message: string }>(
  null as unknown as ParserInput<Schema, "valibotEvent">,
);
expectType<{ legacy: true }>(
  null as unknown as ParserInput<Schema, "legacyEvent">,
);

const { postMessage } = createWebView({
  bridge: bridge({}),
  postMessageSchema: schema,
});
postMessage("zodEvent", { count: 1 });
postMessage("valibotEvent", { message: "hi" });
postMessage("legacyEvent", { legacy: true });
// @ts-expect-error native sends the schema input type (number)
postMessage("zodEvent", { count: "1" });
// @ts-expect-error unknown event
postMessage("nope", {});
