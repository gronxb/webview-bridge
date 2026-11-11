/**
 * Standard Schema support: `delegate(input, output?)` validates and transforms
 * values on native, and `postMessageSchema` events accept Standard Schemas.
 */
import {
  bridge,
  createWebView,
  delegate,
  postMessageSchema,
} from "@webview-bridge/react-native";
import { linkBridge } from "@webview-bridge/web";
import { act, create } from "react-test-renderer";
import * as v from "valibot";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { loadPage, resetEnvironment } from "./harness";

const outcome = (promise: Promise<unknown>) =>
  promise.then(
    (value) => ({ value }),
    (error: Error) => ({ error: `${error.name}: ${error.message}` }),
  );

describe("delegate() with Standard Schemas", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetEnvironment();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createSchemaBridge = () =>
    bridge({
      getUser: delegate(
        z.object({ id: z.string().transform((value) => Number(value)) }),
        z.object({ id: z.number(), name: z.string().toUpperCase() }),
      ),
      track: delegate(v.object({ event: v.string() })),
      slowCheck: delegate(
        z.string().refine(async (value) => value.length > 2, "too short"),
        z.boolean(),
      ),
      legacy: delegate<(a: number, b: number) => Promise<number>>(),
    });
  type SchemaBridge = ReturnType<typeof createSchemaBridge>;

  const mount = (overrides: Partial<Record<string, unknown>> = {}) => {
    const calls: unknown[] = [];
    const { WebView } = createWebView({ bridge: createSchemaBridge() });
    act(() => {
      create(
        <WebView
          testID="default"
          delegate={{
            getUser: async (input) => {
              calls.push(input);
              return { id: input.id, name: "ada" };
            },
            track: (input) => {
              calls.push(input);
            },
            slowCheck: async () => true,
            legacy: async (a, b) => a + b,
            ...(overrides as object),
          }}
        />,
      );
    });
    loadPage({ beforeContentLoaded: "on-time" });
    return { calls, web: linkBridge<SchemaBridge>({ throwOnError: true }) };
  };

  it("validates and transforms the input, and the output, on native", async () => {
    const { calls, web } = mount();

    await expect(web.getUser({ id: "7" })).resolves.toEqual({
      id: 7,
      name: "ADA",
    });
    // The implementation received the input schema's output.
    expect(calls).toEqual([{ id: 7 }]);
  });

  it("rejects invalid input without calling the implementation", async () => {
    const { calls, web } = mount();

    const result = await outcome(
      web.getUser({ id: 7 } as unknown as { id: string }),
    );

    expect(result).toEqual({
      error: expect.stringMatching(
        /^BridgeValidationError: \[WebViewBridge\] Invalid input for 'getUser': id: /,
      ),
    });
    expect(calls).toEqual([]);
    // Invalid input comes from the page: a warning, not a native error.
    expect(warn).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("rejects an implementation result that fails the output schema", async () => {
    const { web } = mount({
      getUser: async () => ({ id: "not a number", name: "ada" }),
    });

    const result = await outcome(web.getUser({ id: "7" }));

    expect(result).toEqual({
      error: expect.stringMatching(
        /^BridgeValidationError: \[WebViewBridge\] Invalid output for 'getUser': id: /,
      ),
    });
    expect(error).toHaveBeenCalled();
  });

  it("works with Valibot and returns the implementation's value without an output schema", async () => {
    const { calls, web } = mount({
      track: (input: unknown) => {
        return { tracked: input };
      },
    });

    await expect(web.track({ event: "open" })).resolves.toEqual({
      tracked: { event: "open" },
    });
    await expect(
      outcome(web.track({ event: 1 } as unknown as { event: string })),
    ).resolves.toEqual({
      error: expect.stringContaining("Invalid input for 'track': event:"),
    });
    expect(calls).toEqual([]);
  });

  it("supports schemas that validate asynchronously", async () => {
    const { web } = mount();

    await expect(web.slowCheck("long enough")).resolves.toBe(true);
    await expect(outcome(web.slowCheck("no"))).resolves.toEqual({
      error: expect.stringContaining(
        "Invalid input for 'slowCheck': too short",
      ),
    });
  });

  it("keeps passing all arguments through for the generic form", async () => {
    const { web } = mount();

    await expect(web.legacy(2, 3)).resolves.toBe(5);
  });
});

describe("postMessageSchema with Standard Schemas", () => {
  beforeEach(() => {
    resetEnvironment();
  });

  const events = postMessageSchema({
    zodEvent: z.object({ count: z.number().transform((n) => `#${n}`) }),
    valibotEvent: v.object({ message: v.pipe(v.string(), v.trim()) }),
    legacyEvent: { validate: (data: unknown) => ({ wrapped: data }) },
    asyncEvent: z.string().refine(async () => true),
  });
  type Events = typeof events;

  const setup = () => {
    const appBridge = bridge({});
    const { WebView, postMessage } = createWebView({
      bridge: appBridge,
      postMessageSchema: events,
    });
    act(() => {
      create(<WebView testID="default" />);
    });
    loadPage({ beforeContentLoaded: "on-time" });
    const web = linkBridge<typeof appBridge, Events>();
    return { postMessage, web };
  };

  it("sends the schema output to the page (Zod, Valibot, and legacy validate)", () => {
    const { postMessage, web } = setup();
    const received: unknown[] = [];
    web.addEventListener("zodEvent", (data) => received.push(data));
    web.addEventListener("valibotEvent", (data) => received.push(data));
    web.addEventListener("legacyEvent", (data) => received.push(data));

    postMessage("zodEvent", { count: 3 });
    postMessage("valibotEvent", { message: "  hi  " });
    postMessage("legacyEvent", { legacy: true } as never);

    expect(received).toEqual([
      // Zod 4 schemas also have a boolean `validate` method; the Standard
      // Schema must win, so the page gets the data, not `true`.
      { count: "#3" },
      { message: "hi" },
      { wrapped: { legacy: true } },
    ]);
  });

  it("throws on an invalid payload and does not send it", () => {
    const { postMessage, web } = setup();
    const received: unknown[] = [];
    web.addEventListener("zodEvent", (data) => received.push(data));

    expect(() =>
      postMessage("zodEvent", { count: "3" } as unknown as { count: number }),
    ).toThrow(/Invalid input for 'zodEvent': count:/);
    expect(received).toEqual([]);
  });

  it("rejects schemas that validate asynchronously", () => {
    const { postMessage } = setup();

    expect(() => postMessage("asyncEvent", "x")).toThrow(
      /validates asynchronously/,
    );
  });
});
