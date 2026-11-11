/**
 * Runtime behaviour of `delegate()` methods and the WebView `delegate` prop
 * (#122). Hydration-specific cases live in `hydration.test.tsx`.
 */
import { bridge, createWebView, delegate } from "@webview-bridge/react-native";
import { linkBridge } from "@webview-bridge/web";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPage, native, resetEnvironment, resetPage } from "./harness";

type User = { id: string; screen: string };

const createDelegateBridge = () =>
  bridge({
    count: 0,
    async ping() {
      return "pong";
    },
    goBack: delegate<() => Promise<string>>(),
    getUser: delegate<(id: string) => Promise<User>>(),
  });
type DelegateBridge = ReturnType<typeof createDelegateBridge>;

const delegateFor = (screen: string) => ({
  goBack: async () => `back from ${screen}`,
  getUser: async (id: string) => ({ id, screen }),
});

describe("delegate()", () => {
  beforeEach(() => {
    resetEnvironment();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs the WebView's implementation with its latest props", async () => {
    const { WebView } = createWebView({ bridge: createDelegateBridge() });
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <WebView testID="default" delegate={delegateFor("first")} />,
      );
    });
    loadPage({ beforeContentLoaded: "on-time" });
    const web = linkBridge<DelegateBridge>();

    await expect(web.getUser("u1")).resolves.toEqual({
      id: "u1",
      screen: "first",
    });

    act(() => {
      renderer.update(
        <WebView testID="default" delegate={delegateFor("second")} />,
      );
    });
    await expect(web.getUser("u2")).resolves.toEqual({
      id: "u2",
      screen: "second",
    });
    await expect(web.ping()).resolves.toBe("pong");
  });

  it("routes a call to the implementation of the WebView that hosts the page", async () => {
    const { WebView } = createWebView({ bridge: createDelegateBridge() });
    act(() => {
      create(
        <>
          <WebView testID="A" delegate={delegateFor("A")} />
          <WebView testID="B" delegate={delegateFor("B")} />
        </>,
      );
    });

    loadPage({ id: "A", beforeContentLoaded: "on-time" });
    await expect(linkBridge<DelegateBridge>().goBack()).resolves.toBe(
      "back from A",
    );

    resetPage();
    loadPage({ id: "B", beforeContentLoaded: "on-time" });
    await expect(linkBridge<DelegateBridge>().goBack()).resolves.toBe(
      "back from B",
    );
  });

  it("calls the native fallback for a delegate() method this WebView lacks", async () => {
    const fallback = vi.fn();
    const { WebView } = createWebView({
      bridge: createDelegateBridge(),
      fallback,
    });
    act(() => {
      create(
        <WebView
          testID="default"
          // @ts-expect-error: deliberately omit getUser.
          delegate={{ goBack: async () => "went back" }}
        />,
      );
    });
    loadPage({ beforeContentLoaded: "on-time" });
    const web = linkBridge<DelegateBridge>();

    expect(web.isNativeMethodAvailable("goBack")).toBe(true);
    expect(web.isNativeMethodAvailable("getUser")).toBe(false);
    await web.getUser("u1");
    await vi.waitFor(() => {
      expect(fallback).toHaveBeenCalledWith("getUser");
    });
  });

  it("runs middleware around a delegated implementation", async () => {
    const calls: string[] = [];
    const appBridge = createDelegateBridge().use(async (request, next) => {
      calls.push(`before:${request.method}`);
      request.args = ["rewritten"];
      const result = await next();
      calls.push("after");
      return result;
    });
    const { WebView } = createWebView({ bridge: appBridge });
    act(() => {
      create(<WebView testID="default" delegate={delegateFor("A")} />);
    });
    loadPage({ beforeContentLoaded: "on-time" });

    await expect(
      linkBridge<DelegateBridge>().getUser("original"),
    ).resolves.toEqual({ id: "rewritten", screen: "A" });
    expect(calls).toEqual(["before:getUser", "after"]);
  });

  it("does not pass the delegate prop to react-native-webview", () => {
    const { WebView } = createWebView({ bridge: createDelegateBridge() });
    act(() => {
      create(<WebView testID="default" delegate={delegateFor("A")} />);
    });

    expect(native.props.get("default")).not.toHaveProperty("delegate");
  });

  it("keeps delegate() stubs out of the injected initial state", () => {
    const { WebView } = createWebView({ bridge: createDelegateBridge() });
    act(() => {
      create(<WebView testID="default" delegate={delegateFor("A")} />);
    });
    loadPage({ beforeContentLoaded: "on-time" });

    const w = window as any;
    expect(w.__bridgeInitialState__).toEqual({ count: 0 });
    expect(w.__bridgeMethods__).toEqual(["ping", "goBack", "getUser"]);
  });

  it("throws a descriptive error when native calls a delegate() method directly", async () => {
    await expect(createDelegateBridge().getState().goBack()).rejects.toThrow(
      "`delegate` prop",
    );
  });
});
