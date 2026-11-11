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

/** The original postMessage event schema shape: a `validate` function. */
export type PostMessageValidator = {
  validate: (data: unknown) => unknown;
};

/**
 * The schema of one postMessage event: a Standard Schema (Zod, Valibot,
 * ArkType, ...) or an object with a `validate` function.
 */
export type PostMessageEventSchema = StandardSchemaV1 | PostMessageValidator;

export type PostMessageSchemaObject = Record<
  string | number | symbol,
  PostMessageEventSchema
>;

export type ParserSchema<T = object> = {
  [P in keyof T]: PostMessageEventSchema;
};

/**
 * The payload type the Web side receives for `EventName`.
 * A Standard Schema takes precedence over a `validate` member, because some
 * schema libraries (e.g. Zod 4) also have an unrelated `validate` method.
 */
export type Parser<
  Input extends ParserSchema<any>,
  EventName,
> = Input extends undefined
  ? Record<string, Primitive> | Primitive
  : EventName extends keyof Input
    ? Input[EventName] extends StandardSchemaV1
      ? InferSchemaOutput<Input[EventName]>
      : Input[EventName] extends { validate: (data: unknown) => infer R }
        ? R
        : Record<string, Primitive> | Primitive
    : never;

/** The payload type native passes to `postMessage` for `EventName`. */
export type ParserInput<
  Input extends ParserSchema<any>,
  EventName,
> = Input extends undefined
  ? Record<string, Primitive> | Primitive
  : EventName extends keyof Input
    ? Input[EventName] extends StandardSchemaV1
      ? InferSchemaInput<Input[EventName]>
      : Input[EventName] extends { validate: (data: unknown) => infer R }
        ? R
        : Record<string, Primitive> | Primitive
    : never;

/**
 * The Standard Schema v1 interface (https://standardschema.dev), copied as
 * types only so no runtime dependency is needed. Zod, Valibot, ArkType and
 * other libraries implement it.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1Props<Input, Output>;
}

export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1;
  readonly vendor: string;
  readonly validate: (
    value: unknown,
  ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
  readonly types?: StandardSchemaV1Types<Input, Output> | undefined;
}

export type StandardSchemaV1Result<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaV1Issue> };

export interface StandardSchemaV1Issue {
  readonly message: string;
  readonly path?:
    | ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>
    | undefined;
}

export interface StandardSchemaV1Types<Input = unknown, Output = Input> {
  readonly input: Input;
  readonly output: Output;
}

/** The type a schema accepts (what the caller passes). */
export type InferSchemaInput<S extends StandardSchemaV1> = NonNullable<
  S["~standard"]["types"]
>["input"];

/** The type a schema produces after validation and transforms. */
export type InferSchemaOutput<S extends StandardSchemaV1> = NonNullable<
  S["~standard"]["types"]
>["output"];

declare const DelegatedMethodBrand: unique symbol;

/**
 * A bridge method whose signature is declared on the bridge but whose
 * implementation is provided per WebView through the `delegate` prop.
 * Created with `delegate()` from `@webview-bridge/react-native`.
 *
 * `F` is the signature the Web side calls. `Handler` is the signature of the
 * native implementation; it differs from `F` when schemas transform values.
 */
export type Delegated<
  F extends AsyncFunction,
  Handler extends (...args: any[]) => unknown = F,
> = F & {
  readonly [DelegatedMethodBrand]: { readonly handler: Handler };
};

type DelegatedArgs<Input> = undefined extends Input
  ? [input?: Input]
  : [input: Input];

/** The method type created by `delegate(input, output?)`. */
export type SchemaDelegated<
  In extends StandardSchemaV1,
  Out extends StandardSchemaV1 | undefined = undefined,
> = Delegated<
  (
    ...args: DelegatedArgs<InferSchemaInput<In>>
  ) => Promise<Out extends StandardSchemaV1 ? InferSchemaOutput<Out> : unknown>,
  (
    input: InferSchemaOutput<In>,
  ) => Out extends StandardSchemaV1
    ? InferSchemaInput<Out> | Promise<InferSchemaInput<Out>>
    : unknown
>;

type BridgeShape<T> = T extends { getState: () => infer S } ? S : T;

type IsAny<T> = 0 extends 1 & T ? true : false;

type IsDelegated<V> = IsAny<V> extends true
  ? false
  : V extends { readonly [DelegatedMethodBrand]: unknown }
    ? true
    : false;

/** Keys of the methods declared with `delegate()` on a bridge. */
export type DelegatedMethodKeys<T> = {
  // `any` matches every conditional type, so it must not count as delegated.
  // `-?`: an optional member would otherwise add `undefined` to the key union.
  [K in keyof BridgeShape<T>]-?: IsDelegated<BridgeShape<T>[K]> extends true
    ? K
    : never;
}[keyof BridgeShape<T>];

/**
 * Implementations for every `delegate()` method of a bridge.
 * Accepts either the bridge store type (`typeof appBridge`) or its state type.
 */
export type BridgeDelegate<T> = {
  [K in DelegatedMethodKeys<T>]: BridgeShape<T>[K] extends {
    readonly [DelegatedMethodBrand]: { readonly handler: infer Handler };
  }
    ? Handler
    : never;
};

/**
 * The bridge state with `delegate()` methods turned back into plain method
 * signatures, for places that accept implementations (e.g. `initialBridge`).
 */
export type UndelegatedBridge<T> = {
  [K in keyof T]: IsDelegated<T[K]> extends true
    ? T[K] extends AsyncFunction
      ? (...args: Parameters<T[K]>) => ReturnType<T[K]>
      : T[K]
    : T[K];
};
