# Using PostMessage

This guide will teach you how to send events from React Native to web and subscribe to those events within the web.

<video src="/post-message.mp4" width="320" height="240" muted autoplay loop />


## Installation

Event schemas use [Standard Schema](https://standardschema.dev), so you can pass a schema from any library that implements it, such as:

* [zod](https://github.com/colinhacks/zod) (3.24 or later)
* [valibot](https://github.com/fabian-hiller/valibot) (1.0 or later)
* [arktype](https://github.com/arktypeio/arktype)

::: code-group

```sh [npm]
$ npm add @webview-bridge/web zod
```

```sh [pnpm]
$ pnpm add @webview-bridge/web zod
```

```sh [yarn]
$ yarn add @webview-bridge/web zod
```

:::

## React Native Part

In React Native, define the events in advance and export their types. Pass a schema for each event directly; the types are inferred from it.

::: tip NOTE
Even if you don't define the event schema, you can use postMessage loosely. If the types are not important, you can skip them and just use postMessage.
:::

::: code-group

```tsx [zod]
import { createWebView, postMessageSchema } from "@webview-bridge/react-native";
import { z } from "zod";

const appPostMessageSchema = postMessageSchema({
  eventName1: z.string(),
  eventName2: z.object({ message: z.string() }),
});

// Export the event schema to be used in the web application
export type AppPostMessageSchema = typeof appPostMessageSchema;

// When you bridge a webview, a postMessage is extracted.
export const { postMessage } = createWebView({
  postMessageSchema: appPostMessageSchema, // Optional. Skip it if the types don't matter to you.
  // ..
});

// usage
postMessage("eventName1", "test");
postMessage("eventName2", {
  message: "test",
});
```

```tsx [valibot]
import { createWebView, postMessageSchema } from "@webview-bridge/react-native";
import * as v from "valibot";

const appPostMessageSchema = postMessageSchema({
  eventName1: v.string(),
  eventName2: v.object({ message: v.string() }),
});

// Export the event schema to be used in the web application
export type AppPostMessageSchema = typeof appPostMessageSchema;

// When you bridge a webview, a postMessage is extracted.
export const { postMessage } = createWebView({
  postMessageSchema: appPostMessageSchema, // Optional. Skip it if the types don't matter to you.
  // ..
});

// usage
postMessage("eventName1", "test");
postMessage("eventName2", {
  message: "test",
});
```

```tsx [only type]
import { createWebView, postMessageSchema } from "@webview-bridge/react-native";

// Without a schema library, give each event a `validate` function.
// This only declares types; it does not validate anything.
const appPostMessageSchema = postMessageSchema({
  eventName1: {
    validate: (data) => data as string,
  },
  eventName2: {
    validate: (data) => data as { message: string },
  },
});

export type AppPostMessageSchema = typeof appPostMessageSchema;

export const { postMessage } = createWebView({
  postMessageSchema: appPostMessageSchema,
  // ..
});
```

:::

### Validation and transforms

`postMessage` validates the payload with the event's schema before sending it:

- `postMessage` takes the schema's **input** type, and the page receives its **output** type. A schema with transforms (for example `z.date().transform((d) => d.toISOString())`) converts the value on native.
- An invalid payload throws a `BridgeValidationError` from `postMessage`, and nothing is sent.
- `postMessage` is synchronous, so schemas that validate asynchronously (for example Zod's async `refine`) are rejected with an error.
- Payloads cross the bridge as JSON, so TypeScript rejects event schemas whose output type contains a `Date`, `BigInt`, `Map`, `Set`, an object with methods, a function, or `undefined` array items. Transform the value instead, for example `z.date().transform((d) => d.toISOString())`. The check is structural: a class instance without methods arrives as a plain object, and `NaN`/`Infinity` arrive as `null`.

::: details Migrating from `validate` functions
Earlier versions only accepted `{ validate }` objects, so schemas were wrapped like `{ validate: (data) => z.string().parse(data) }`. That still works. You can now pass the schema itself instead: `eventName1: z.string()`.
:::

## Web Part
In the web part, as in the guide above, import the `AppPostMessageSchema` declared in React Native and pass it to the second generic of `linkBridge`.

::: tip NOTE
If you cannot import the type, you can leave the second generic empty, and it will still work loosely with the correct type.
:::

```tsx
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge, AppPostMessageSchema } from ""; // Import the type 'appBridge' and 'appPostMessageSchema' declared in native

const bridge = linkBridge<AppBridge, AppPostMessageSchema>({
  // ..
});

const unsubscribe = bridge.addEventListener("eventName1", (message) => {
  window.alert(message);
});
unsubscribe(); // Unsubscribe from the event


const unsubscribe2 = bridge.addEventListener("eventName2", (data) => {
  window.alert(data.message);
});
unsubscribe2(); // Unsubscribe from the event
```


# Broadcast

Due to React Navigation and other factors, there can be multiple instances of a WebView. Sometimes, you may want to send messages to all WebView instances, while at other times, you may only want to target the last WebView instance (e.g., the top of the React Navigation stack).

To send a message to all WebView instances:
```ts
postMessage(..., ..., { broadcast: true });
```

To send a message only to the last WebView instance:
```ts
postMessage(..., ...); // @default false
// or 
postMessage(..., ..., { broadcast: false });
```