---
"@webview-bridge/react-native": minor
"@webview-bridge/types": minor
"@webview-bridge/web": minor
---

`postMessageSchema` accepts [Standard Schemas](https://standardschema.dev) (Zod 3.24+, Valibot 1.0+, ArkType, ...) directly, so events no longer need a `{ validate }` wrapper.

```tsx
const appPostMessageSchema = postMessageSchema({
  eventName1: z.string(),
  eventName2: v.object({ message: v.string() }),
});
```

- `postMessage` takes the schema's input type, validates the payload, and sends the schema's output to the page. The Web listener receives the output type.
- An invalid payload throws a `BridgeValidationError` from `postMessage` and is not sent. Event schemas whose output type contains a `Date`, `BigInt`, `Map`, `Set` or function are rejected at compile time, because payloads cross the bridge as JSON. Schemas that validate asynchronously are rejected, because `postMessage` is synchronous.
- `{ validate }` objects keep working as before. When an event schema is a Standard Schema, it is used even if the object also has a `validate` method: Zod 4 schemas have an unrelated `validate` method that returns a boolean, which used to be sent to the page instead of the data.
- New type: `ParserInput` (the payload type `postMessage` accepts).
