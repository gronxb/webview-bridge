/**
 * Type-level tests for `delegate({ input, output })` with Standard Schemas and for
 * Standard Schema `postMessageSchema` events. Checked by `pnpm test:type`.
 */
import * as v from "valibot";
import { z } from "zod";
import type { BridgeDelegate, Parser, ParserInput, ParserSchema } from "../src";
import { bridge, createWebView, delegate, postMessageSchema } from "../src";

const expectType = <T,>(_value: T) => {};

const userSchema = z.object({ id: z.number(), name: z.string() });

const appBridge = bridge({
  goBack: delegate(),
  // Input transforms: the page sends a string, the implementation gets a number.
  getUser: delegate({
    input: z.object({ id: z.string().transform((value) => Number(value)) }),
    output: userSchema,
  }),
  // Input only: the page gets `unknown` back.
  track: delegate({ input: v.object({ event: v.string() }) }),
  // Output only: no argument, typed result.
  refresh: delegate({ output: z.boolean() }),
  // Optional input (`undefined` accepted): callable with or without it.
  search: delegate({
    input: z.string().optional(),
    output: z.array(z.string()),
  }),
  // `{}` is the same as `delegate()`.
  ping: delegate({}),
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
expectType<Promise<string[]>>(state.search());
expectType<Promise<string[]>>(state.search("q"));
expectType<Promise<unknown>>(state.ping());
// @ts-expect-error an output-only method takes no argument
state.refresh(true);
// @ts-expect-error an output-only method resolves to the output type
expectType<Promise<string>>(state.refresh());
expectType<Promise<boolean>>(state.confirm("ok?"));
// @ts-expect-error delegate() with no arguments takes no arguments
state.goBack(1);
// @ts-expect-error delegate() with no arguments resolves to void, not a value
expectType<Promise<string>>(state.goBack());
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
  search: (query) => {
    expectType<string | undefined>(query);
    return [];
  },
  ping: () => {},
  confirm: async () => true,
};

export const wrongRefresh: BridgeDelegate<typeof appBridge> = {
  ...handlers,
  // @ts-expect-error an output-only implementation takes no input
  refresh: (_input: string) => true,
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

// Generic signatures in the type-argument form stay generic for the
// implementation.
const genericBridge = bridge({
  echo: delegate<<T>(value: T) => Promise<T>>(),
});
export const genericOk: BridgeDelegate<typeof genericBridge> = {
  echo: async (value) => value,
};
export const genericWrong: BridgeDelegate<typeof genericBridge> = {
  // @ts-expect-error must return the value's type, not a string
  echo: async () => "wrong",
};

// A `ParserSchema` annotation without concrete schemas keeps resolving to
// `unknown`, as it did before Standard Schema support.
type LooseSchema = ParserSchema<{ event: unknown }>;
expectType<unknown>(null as unknown as Parser<LooseSchema, "event">);
export const looseOutput: Parser<LooseSchema, "event"> = new Date();
export const looseInput: ParserInput<LooseSchema, "event"> = new Date();
