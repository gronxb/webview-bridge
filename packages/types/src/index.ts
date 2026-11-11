export type AsyncFunction = (...args: any[]) => Promise<any>;

export type Primitive = string | number | boolean | null | undefined;
export type PrimitiveObject = Record<string, Primitive>;

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

export type PostMessageSchemaObject = Record<
  string | number | symbol,
  {
    validate: (value: unknown) => unknown;
  }
>;

export type ParserSchema<T = object> = {
  [P in keyof T]: {
    validate: (data: unknown) => unknown;
  };
};

export type Parser<
  Input extends ParserSchema<any>,
  EventName,
> = Input extends undefined
  ? Record<string, Primitive> | Primitive
  : EventName extends keyof Input
    ? Input[EventName]["validate"] extends (data: unknown) => unknown
      ? ReturnType<Input[EventName]["validate"]>
      : Record<string, Primitive> | Primitive
    : never;

declare const DelegatedMethodBrand: unique symbol;

/**
 * A bridge method whose signature is declared on the bridge but whose
 * implementation is provided per WebView through the `bridgeHandlers` prop.
 * Created with `delegate()` from `@webview-bridge/react-native`.
 */
export type Delegated<F extends AsyncFunction> = F & {
  readonly [DelegatedMethodBrand]: true;
};

type BridgeShape<T> = T extends { getState: () => infer S } ? S : T;

/** Keys of the methods declared with `delegate()` on a bridge. */
export type DelegatedMethodKeys<T> = {
  [K in keyof BridgeShape<T>]: BridgeShape<T>[K] extends {
    readonly [DelegatedMethodBrand]: true;
  }
    ? K
    : never;
}[keyof BridgeShape<T>];

/**
 * Implementations for every `delegate()` method of a bridge.
 * Accepts either the bridge store type (`typeof appBridge`) or its state type.
 */
export type BridgeHandlers<T> = {
  [K in DelegatedMethodKeys<T>]: BridgeShape<T>[K] extends AsyncFunction
    ? (...args: Parameters<BridgeShape<T>[K]>) => ReturnType<BridgeShape<T>[K]>
    : never;
};
