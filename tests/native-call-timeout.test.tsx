/**
 * `linkBridge`'s `timeout` limits how long native takes to acknowledge a call,
 * not how long the native method runs. Methods that wait for the user (dialogs,
 * pickers, in-app browsers) must not be cut off.
 */
import { bridge, createWebView } from "@webview-bridge/react-native";
import { linkBridge } from "@webview-bridge/web";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPage, native, resetEnvironment } from "./harness";

const TIMEOUT = 100;
const SLOW = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const createAppBridge = () =>
  bridge({
    count: 1,
    async fast() {
      return "fast";
    },
    async slow() {
      await sleep(SLOW);
      return "slow";
    },
    async slowFail(): Promise<string> {
      await sleep(SLOW);
      throw new Error("slow failure");
    },
  });
type AppBridge = ReturnType<typeof createAppBridge>;

const mount = () => {
  const { WebView } = createWebView({ bridge: createAppBridge() });
  act(() => {
    create(<WebView testID="default" />);
  });
};

const outcome = (promise: Promise<unknown>) =>
  promise.then(
    (value) => ({ value }),
    (error: Error) => ({ error: error.message }),
  );

describe("native call timeout", () => {
  beforeEach(() => {
    resetEnvironment();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each([false, true])("throwOnError: %s", (throwOnError) => {
    it("an acknowledged call resolves with its result after the timeout has passed", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      const web = linkBridge<AppBridge>({ timeout: TIMEOUT, throwOnError });

      await expect(outcome(web.slow())).resolves.toEqual({ value: "slow" });
    });

    it("an acknowledged call that fails after the timeout reports the native error", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      const web = linkBridge<AppBridge>({ timeout: TIMEOUT, throwOnError });

      await expect(outcome(web.slowFail())).resolves.toEqual(
        throwOnError ? { error: "slow failure" } : { value: undefined },
      );
    });

    it("native without the ack keeps the full-call timeout", async () => {
      mount();
      native.droppedInjections.push(/:ack/);
      loadPage({ beforeContentLoaded: "on-time" });
      const web = linkBridge<AppBridge>({ timeout: TIMEOUT, throwOnError });

      await expect(outcome(web.slow())).resolves.toEqual(
        throwOnError ? { error: "Timeout" } : { value: undefined },
      );
      // Fast calls still finish within the timeout.
      await expect(outcome(web.fast())).resolves.toEqual({ value: "fast" });
    });

    it("times out when the call never reaches native", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      native.ignoredMessageTypes.add("bridge");
      const web = linkBridge<AppBridge>({ timeout: TIMEOUT, throwOnError });

      await expect(outcome(web.fast())).resolves.toEqual(
        throwOnError ? { error: "Timeout" } : { value: undefined },
      );
    });
  });

  it("times out when a state key is called as a method (native never answers)", async () => {
    mount();
    loadPage({ beforeContentLoaded: "on-time" });
    const web = linkBridge<AppBridge>({ timeout: TIMEOUT, throwOnError: true });

    await expect(outcome(web.loose.count())).resolves.toEqual({
      error: "Timeout",
    });
    expect(
      native.injections.some(
        (i) => i.script.includes("count-") && i.script.includes(":ack"),
      ),
    ).toBe(false);
  });

  it("does not time out a call made before hydration once native acknowledges it", async () => {
    mount();
    loadPage({ beforeContentLoaded: "late" });
    const web = linkBridge<AppBridge>({ timeout: TIMEOUT, throwOnError: true });

    await expect(outcome(web.slow())).resolves.toEqual({ value: "slow" });
  });

  it("timeout: 0 still waits for a slow call", async () => {
    mount();
    native.droppedInjections.push(/:ack/);
    loadPage({ beforeContentLoaded: "on-time" });
    const web = linkBridge<AppBridge>({ timeout: 0, throwOnError: true });

    await expect(outcome(web.slow())).resolves.toEqual({ value: "slow" });
  });

  it("native acknowledges each call once, before the result", async () => {
    mount();
    loadPage({ beforeContentLoaded: "on-time" });
    const web = linkBridge<AppBridge>({ timeout: TIMEOUT });

    await web.fast();

    const scripts = native.injections.map((i) => i.script);
    const ackIndex = scripts.findIndex((s) => /fast-[^']*:ack/.test(s));
    const resultIndex = scripts.findIndex(
      (s) => /'fast-[^':]*'/.test(s) && s.includes('"fast"'),
    );
    expect(scripts.filter((s) => /fast-[^']*:ack/.test(s))).toHaveLength(1);
    expect(ackIndex).toBeGreaterThanOrEqual(0);
    expect(resultIndex).toBeGreaterThan(ackIndex);
  });
});

describe("event bookkeeping", () => {
  beforeEach(() => {
    resetEnvironment();
  });

  it("does not keep per-call event keys after calls settle", async () => {
    mount();
    loadPage({ beforeContentLoaded: "on-time" });
    const web = linkBridge<AppBridge>({ timeout: TIMEOUT });

    for (let i = 0; i < 5; i++) {
      await web.fast();
    }

    const emitters = Object.values(
      (window as any).nativeEmitterMap as Record<
        string,
        { events: Record<string, unknown> }
      >,
    );
    const perCallKeys = emitters.flatMap((emitter) =>
      Object.keys(emitter.events).filter((key) => key.startsWith("fast-")),
    );
    expect(perCallKeys).toEqual([]);
  });
});
