// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncFunction = (...args: any[]) => Promise<any>;

export type Primitive = string | number | boolean | null | undefined;

export type Bridge = Record<string, AsyncFunction | Primitive>;

export type BridgeStore<T extends Bridge> = {
  getState: () => T;
  setState: (newState: Partial<OnlyPrimitive<T>>) => void;
  subscribe: (listener: () => void) => () => void;
};

export type ExtractStore<S> = S extends { getState: () => infer T } ? T : never;

export type OnlyPrimitive<T> = {
  [P in keyof T as T[P] extends Primitive ? P : never]: T[P];
};
