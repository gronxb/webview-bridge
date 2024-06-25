# Using PostMessage

This guide will teach you how to send events from React Native to web and subscribe to those events within the web.

## Installation

You need additional libraries to define schemas.
Supported schema libraries:

* [zod](https://github.com/colinhacks/zod)
* [yup](https://github.com/jquense/yup)
* [superstruct](https://github.com/ianstormtaylor/superstruct)


Please choose and use the library you prefer.

Follow the guidelines of each library for schema definition.

::: code-group

```sh [npm]
$ npm add @webview-bridge/web zod
# or 
$ npm add @webview-bridge/web yup
# or 
$ npm add @webview-bridge/web superstruct
```

```sh [pnpm]
$ pnpm add @webview-bridge/web zod
# or 
$ pnpm add @webview-bridge/web yup
# or 
$ pnpm add @webview-bridge/web superstruct
```

```sh [yarn]
$ yarn add @webview-bridge/web zod
# or 
$ yarn add @webview-bridge/web yup
# or 
$ yarn add @webview-bridge/web superstruct
```

:::



## React Native Part

In React Native, you need to define events in advance and export the types.

::: tip NOTE
Even if you don't define the event schema, you can use postMessage loosely. If the types are not important, you can skip them and just use postMessage.
:::


::: code-group

```tsx [zod]
import { createWebView, postMessageSchema } from "@webview-bridge/react-native";
import { z } from "zod";

const appPostMessageSchema = postMessageSchema({
  eventName1: z.object({
    message: z.string(),
  }),
  eventName2: z.string(),
});


// Export the event schema to be used in the web application
export type AppPostMessageSchema = typeof appPostMessageSchema;

// When you bridge a webview, a postMessage is extracted.
export const { postMessage } = createWebView({
  postMessageSchema: appPostMessageSchema, // Pass in the your schema. This is optional, so if the type doesn't matter to you, you don't need to include it.
  // ..
});


// usage
postMessage("eventName1", {
  message: "test",
});
postMessage("eventName2", "test");
```

```tsx [yup]
import { createWebView, postMessageSchema } from "@webview-bridge/react-native";
import { string, object } from "yup";

const appPostMessageSchema = postMessageSchema({
  eventName1: object({
    message: string().required(),
  }),
  eventName2: string().required(),
});


// Export the event schema to be used in the web application
export type AppPostMessageSchema = typeof appPostMessageSchema;

// When you bridge a webview, a postMessage is extracted.
export const { postMessage } = createWebView({
  // ..
  postMessageSchema: appPostMessageSchema, // Pass in the your schema. This is optional, so if the type doesn't matter to you, you don't need to include it.
});

// usage
postMessage("eventName1", {
  message: "test",
});
postMessage("eventName2", "test");
```

```tsx [superstruct]
import { createWebView, postMessageSchema } from "@webview-bridge/react-native";
import { string, object } from "superstruct";

const appPostMessageSchema = postMessageSchema({
  eventName1: object({
    message: string(),
  }),
  eventName2: string(),
});

// Export the event schema to be used in the web application
export type AppPostMessageSchema = typeof appPostMessageSchema;

// When you bridge a webview, a postMessage is extracted.
export const { postMessage } = createWebView({
  // ..
  postMessageSchema: appPostMessageSchema, // Pass in the your schema. This is optional, so if the type doesn't matter to you, you don't need to include it.
});


// usage
postMessage("eventName1", {
  message: "test",
});
postMessage("eventName2", "test");
```

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

const unsubscribe = bridge.addEventListener("eventName1", (data) => {
  window.alert(data.message);
});
unsubscribe(); // Unsubscribe from the event


const unsubscribe2 = bridge.addEventListener("eventName2", (message) => {
  window.alert(message);
});
unsubscribe2(); // Unsubscribe from the event
```
