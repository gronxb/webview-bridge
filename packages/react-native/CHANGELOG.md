# @webview-bridge/react-native

## 1.9.0

### Minor Changes

- 99d42c3: Build the packages with tsdown instead of tsup.

  - **Output now targets ES2015 instead of ES5.** Every WebView that React Native supports runs ES2015 (Android 7+ System WebView, iOS 15.1+ WKWebView), and dropping the ES5 helpers makes the bundles about half the size (for example, `@webview-bridge/web` went from 41 kB to 19 kB). If you load `@webview-bridge/web` in an environment without ES2015 support, transpile it in your own build.
  - **CommonJS consumers get CommonJS types.** The `exports` map now points `require` at `index.d.cts` and `import` at `index.d.ts`. Before, `require` resolved the ESM declaration file ("Masquerading as ESM" in arethetypeswrong).
  - File names, exported names, and the `react-native` condition are unchanged.

- 7311103: Add `delegate()` for native methods that need React hooks or context.

  Declare the method on the bridge with `delegate()`, and implement it per WebView with the WebView's new `delegate` prop. The implementation runs with that WebView's latest props, so it can use `useNavigation()`, context values, and other hooks of the screen that renders the WebView.

  ```tsx
  export const appBridge = bridge({
    goBack: delegate(),
    getUser: delegate({
      input: z.object({ id: z.string() }),
      output: userSchema,
    }),
  });

  <WebView
    delegate={{
      goBack: async () => navigation.goBack(),
      getUser: async ({ id }) => fetchUser(id),
    }}
  />;
  ```

  - Types are inferred from [Standard Schemas](https://standardschema.dev) (Zod, Valibot, ArkType, ...): `delegate({ input, output })`, both optional. The page passes the input schema's input type and receives the output schema's output type. The native implementation receives the validated, transformed input and its return value is validated against the output schema. A value that fails a schema makes the call fail with a `BridgeValidationError`.
  - `delegate()` declares a method without arguments or a return value, `delegate({ output })` one that only returns a value, and `delegate<Signature>()` declares the signature with a type argument instead (no runtime validation).
  - A method declared with schemas takes exactly the arguments they describe (one with `input`, none without); extra arguments fail with a `BridgeValidationError`. Input is validated after middleware, right before the implementation, and output is validated on the final result after middleware.
  - Values cross the bridge as JSON, so schemas whose page-facing types contain a `Date`, `BigInt`, `Map`, `Set`, an object with methods, a function or `undefined` array items are rejected at compile time.
  - The `delegate` prop is type-checked: it is required when the bridge has delegated methods, every delegated method must be implemented with a matching signature, and regular methods cannot be listed.
  - Each WebView runs its own implementations, so WebViews that share one bridge do not call each other's.
  - A delegated method that is missing from the `delegate` prop when the WebView mounts is not exposed to that page (`isNativeMethodAvailable` returns `false`, and calls go through the fallback flow).
  - Bridge middleware runs around delegated methods as it does for regular methods.
  - On the Web side, delegated methods are called like any other native method, and `linkBridge({ initialBridge })` accepts plain implementations for them.
  - New exports: `delegate`, `BridgeValidationError`, and the types `Delegated`, `SchemaDelegated`, `DelegatedMethodKeys`, `BridgeDelegate`, `UndelegatedBridge`, `BridgeWebViewProps`, `StandardSchemaV1`, `InferSchemaInput`, `InferSchemaOutput`.

- 9419834: `linkBridge`'s `timeout` now limits how long native takes to acknowledge a call, not how long the native method runs.

  Native methods that wait for the user, such as a confirm dialog, an image picker, or an in-app browser, used to be cut off after `timeout` (2000 ms by default). The call then resolved to `undefined`, or rejected with `Error("Timeout")` under `throwOnError`. Now native acknowledges each call as soon as it starts running the method, and from then on the page waits for the result with no time limit.

  - `timeout` still applies when native never answers, for example when a message is lost, or when a state key is called as a method.
  - Compatibility: a page running in a native build without the acknowledgement keeps the old behavior (the whole call is limited by `timeout`). An older page ignores the acknowledgement.
  - Behavior change: a slow native method that used to time out now resolves with its real result. If you relied on `timeout` to cap a method's run time, enforce that limit inside the method or around the call.

- ce96bcf: `postMessageSchema` accepts [Standard Schemas](https://standardschema.dev) (Zod 3.24+, Valibot 1.0+, ArkType, ...) directly, so events no longer need a `{ validate }` wrapper.

  ```tsx
  const appPostMessageSchema = postMessageSchema({
    eventName1: z.string(),
    eventName2: v.object({ message: v.string() }),
  });
  ```

  - `postMessage` takes the schema's input type, validates the payload, and sends the schema's output to the page. The Web listener receives the output type.
  - An invalid payload throws a `BridgeValidationError` from `postMessage` and is not sent. Event schemas whose output type contains a `Date`, `BigInt`, `Map`, `Set`, an object with methods, a function or `undefined` array items are rejected at compile time, because payloads cross the bridge as JSON. Schemas that validate asynchronously are rejected, because `postMessage` is synchronous.
  - `{ validate }` objects keep working as before. When an event schema is a Standard Schema, it is used even if the object also has a `validate` method: Zod 4 schemas have an unrelated `validate` method that returns a boolean, which used to be sent to the page instead of the data.
  - New type: `ParserInput` (the payload type `postMessage` accepts).

### Patch Changes

- 27de797: An exception thrown by `onFallback` (Web) or `fallback` (native) no longer changes the bridge call that triggered it. It is logged with `console.error` instead.

  Before, a throwing `onFallback` made a missing-method call throw synchronously instead of rejecting with `MethodNotFoundError`, and left a call that native answered with an error pending until the `timeout`. When these callbacks fire is unchanged.

- 9423137: Recover when `linkBridge()` runs before the injected bridge methods are available, which can happen on Android because `injectedJavaScriptBeforeContentLoaded` is evaluated asynchronously there.

  - The web side now asks native for the bridge methods (`requestHydrate`), and native answers with a `hydrate` event for that bridge.
  - Native method calls made before hydration completes are sent to native instead of falling back to a no-op.
  - A `hydrate` event that native queued before `linkBridge()` ran is no longer dropped.
  - The `hydrate` payload now uses the `nativeInitialState` key that the web side reads, and the web side still accepts the older `initialState` key.
  - `useBridgeStore` (from `@webview-bridge/react`) now sees native methods that arrive after the first render, because late hydration updates the existing store instead of replacing it.
  - `useBridgeStatus` re-renders when the bridge becomes available.
  - Inside a React Native WebView, calls made before hydration completes go to native even when `initialBridge` defines the method.
  - Awaiting the bridge object no longer hangs: the bridge no longer behaves like a `then`-able.
  - A web call to a `delegate()` method that the WebView does not implement is now answered like a missing method (`MethodNotFoundError` with `throwOnError`), whether or not hydration has finished. Native logs a warning. The stub error from `delegate()` is unchanged.

- 6ffd420: Remove the unmounting WebView's own ref from the internal ref list instead of popping the last one, so `postMessage` keeps reaching WebViews that are still mounted when WebViews unmount out of mount order.
- Updated dependencies [99d42c3]
- Updated dependencies [7311103]
- Updated dependencies [27de797]
- Updated dependencies [9419834]
- Updated dependencies [ce96bcf]
  - @webview-bridge/utils@1.9.0
  - @webview-bridge/types@1.9.0

## 1.8.0

### Minor Changes

- 2abbde9: Add chainable `bridge(...).use(middleware)` support for composing Web-to-Native
  request authentication, preprocessing, short-circuiting, and response logic.

### Patch Changes

- @webview-bridge/utils@1.8.0
- @webview-bridge/types@1.8.0

## 1.7.10

### Patch Changes

- 0ed2131: Fix Metro compatibility by resolving the React Native source entry before the generic import and require builds.
  - @webview-bridge/utils@1.7.10
  - @webview-bridge/types@1.7.10

## 1.7.9

### Patch Changes

- bd11e6c: chore: bump packages
- 0f810f5: fix: Forward native error details to webview
- Updated dependencies [0f810f5]
  - @webview-bridge/utils@1.7.9
  - @webview-bridge/types@1.7.9
