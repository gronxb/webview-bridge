import { PrimitiveObject } from "@webview-bridge/types";

export const mockStore = (initialState: PrimitiveObject = {}) =>
  ({
    state: initialState,
    getState() {
      return this.state;
    },
    subscribe() {
      return () => {};
    },
  }) as const;
