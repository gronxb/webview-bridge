import { PrimitiveObject } from "@webview-bridge/types";

export const mockStore = (initialState: PrimitiveObject = {}) => {
  const state = initialState;

  const getState = () => state;

  const subscribe = () => () => {};

  return {
    getState,
    subscribe,
  };
};
