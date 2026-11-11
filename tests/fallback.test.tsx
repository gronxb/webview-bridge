/**
 * `onFallback` (Web) and `fallback` (native) behaviour.
 *
 * 1.9 keeps when these callbacks fire exactly as in 1.8 (the characterization
 * tests below lock that in), and only isolates exceptions they throw so they
 * can no longer change or stall the bridge call. Cleaning up the semantics is
 * deferred to 2.0.
 */
import { bridge, createWebView } from "@webview-bridge/react-native";
import { MethodNotFoundError, linkBridge } from "@webview-bridge/web";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPage, native, resetEnvironment } from "./harness";

const createAppBridge = () =>
  bridge({
    async ping() {
      return "pong";
    },
    async fail(): Promise<string> {
      throw new Error("native failure");
    },
  });
type AppBridge = ReturnType<typeof createAppBridge>;
type LooseBridge = AppBridge & {
  getState(): ReturnType<AppBridge["getState"]> & {
    missing(): Promise<void>;
  };
};

const mount = (fallback?: (method: string) => void) => {
  const { WebView } = createWebView({
    bridge: createAppBridge(),
    fallback: fallback as never,
  });
  act(() => {
    create(<WebView testID="default" />);
  });
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("fallback callbacks", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetEnvironment();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("unchanged 1.8 triggers", () => {
    it("A: with throwOnError, a missing method calls onFallback and rejects", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      const onFallback = vi.fn();
      const web = linkBridge<LooseBridge>({ throwOnError: true, onFallback });

      await expect(web.missing()).rejects.toBeInstanceOf(MethodNotFoundError);
      expect(onFallback).toHaveBeenCalledWith("missing", []);
    });

    it("B: without throwOnError, a missing method resolves to undefined and skips onFallback", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      const onFallback = vi.fn();
      const web = linkBridge<LooseBridge>({ onFallback });

      await expect(web.missing()).resolves.toBeUndefined();
      expect(onFallback).not.toHaveBeenCalled();
    });

    it("C: with throwOnError, a native method that throws also calls onFallback", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      const onFallback = vi.fn();
      const web = linkBridge<AppBridge>({ throwOnError: true, onFallback });

      await expect(web.fail()).rejects.toThrow("native failure");
      expect(onFallback).toHaveBeenCalledWith("fail", []);
    });

    it("native fallback is reported when the page reads a missing method", async () => {
      const fallback = vi.fn();
      mount(fallback);
      loadPage({ beforeContentLoaded: "on-time" });
      const web = linkBridge<LooseBridge>();

      const missing = web.missing; // reading reports, calling does not add more
      await flush();
      expect(fallback).toHaveBeenCalledTimes(1);
      await missing();
      await missing();
      await flush();
      expect(fallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("callback exceptions are isolated", () => {
    it("a throwing onFallback still rejects a missing method instead of throwing synchronously", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      const web = linkBridge<LooseBridge>({
        throwOnError: true,
        onFallback: () => {
          throw new Error("onFallback failed");
        },
      });

      let promise: Promise<unknown> | undefined;
      expect(() => {
        promise = web.missing();
      }).not.toThrow();
      await expect(promise).rejects.toBeInstanceOf(MethodNotFoundError);
      expect(consoleError).toHaveBeenCalledWith(
        "[WebViewBridge] `onFallback` threw:",
        expect.objectContaining({ message: "onFallback failed" }),
      );
    });

    it("a throwing onFallback still settles a native call with its error (no timeout)", async () => {
      mount();
      loadPage({ beforeContentLoaded: "on-time" });
      const web = linkBridge<AppBridge>({
        throwOnError: true,
        timeout: 0,
        onFallback: () => {
          throw new Error("onFallback failed");
        },
      });

      await expect(web.fail()).rejects.toThrow("native failure");
    });

    it("a throwing native fallback is logged and the bridge keeps working", async () => {
      mount(() => {
        throw new Error("fallback failed");
      });
      loadPage({ beforeContentLoaded: "on-time" });
      const web = linkBridge<LooseBridge>();

      void web.missing;
      await flush();
      expect(consoleError).toHaveBeenCalledWith(
        "[WebViewBridge] `fallback` threw:",
        expect.objectContaining({ message: "fallback failed" }),
      );
      await expect(web.ping()).resolves.toBe("pong");
      expect(native.messages.some((m) => m.type === "fallback")).toBe(true);
    });
  });
});
