---
"@webview-bridge/react-native": minor
"@webview-bridge/types": minor
"@webview-bridge/web": minor
---

Add `delegate()` for native methods that need React hooks or context.

Declare the method on the bridge with `delegate()`, and implement it per WebView with the WebView's new `delegate` prop. The implementation runs with that WebView's latest props, so it can use `useNavigation()`, context values, and other hooks of the screen that renders the WebView.

```tsx
export const appBridge = bridge({
  goBack: delegate(),
  getUser: delegate({ input: z.object({ id: z.string() }), output: userSchema }),
});

<WebView
  delegate={{
    goBack: async () => navigation.goBack(),
    getUser: async ({ id }) => fetchUser(id),
  }}
/>
```

- Types are inferred from [Standard Schemas](https://standardschema.dev) (Zod, Valibot, ArkType, ...): `delegate({ input, output })`, both optional. The page passes the input schema's input type and receives the output schema's output type. The native implementation receives the validated, transformed input and its return value is validated against the output schema. A value that fails a schema makes the call fail with a `BridgeValidationError`.
- `delegate()` declares a method without arguments or a return value, `delegate({ output })` one that only returns a value, and `delegate<Signature>()` declares the signature with a type argument instead (no runtime validation).
- The `delegate` prop is type-checked: it is required when the bridge has delegated methods, every delegated method must be implemented with a matching signature, and regular methods cannot be listed.
- Each WebView runs its own implementations, so WebViews that share one bridge do not call each other's.
- A delegated method that is missing from the `delegate` prop when the WebView mounts is not exposed to that page (`isNativeMethodAvailable` returns `false`, and calls go through the fallback flow).
- Bridge middleware runs around delegated methods as it does for regular methods.
- On the Web side, delegated methods are called like any other native method, and `linkBridge({ initialBridge })` accepts plain implementations for them.
- New exports: `delegate`, `BridgeValidationError`, and the types `Delegated`, `SchemaDelegated`, `DelegatedMethodKeys`, `BridgeDelegate`, `UndelegatedBridge`, `BridgeWebViewProps`, `StandardSchemaV1`, `InferSchemaInput`, `InferSchemaOutput`.
