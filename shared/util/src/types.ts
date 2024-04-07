// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncFunction = (...args: any[]) => Promise<any>;

export type Primitive = string | number | boolean | null | undefined;

export type RawJSON = Primitive | { [key: string]: RawJSON } | RawJSONArray;

interface RawJSONArray extends Array<RawJSON> {}

export type Bridge = Record<string, AsyncFunction | RawJSON>;

export type BridgeStore<T extends Bridge> = {
  getState: () => T;
  setState: (newState: Partial<OnlyJSON<T>>) => void;
  subscribe: (listener: (newState: T, prevState: T) => void) => () => void;
};

export type ExtractStore<S> = S extends { getState: () => infer T } ? T : never;

export type OnlyJSON<T> = {
  [P in keyof T as T[P] extends RawJSON ? P : never]: T[P];
};

export type ExcludePrimitive<T> = {
  [P in keyof T as T[P] extends RawJSON ? never : P]: T[P];
};

export type KeyOfOrString<T> = T extends undefined ? string : keyof T;
