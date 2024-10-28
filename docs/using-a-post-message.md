# Using PostMessage

This guide will teach you how to send events from React Native to web and subscribe to those events within the web.

<video src="/post-message.mp4" width="320" height="240" muted autoplay loop />


## Installation
If you want, additional libraries are needed to define schemas.

Suggested schema libraries:

* [zod](https://github.com/colinhacks/zod)
* [valibot](https://github.com/fabian-hiller/valibot)

Please choose and use the library you prefer.

Follow the guidelines of each library for schema definition.

::: code-group

```sh [npm]
$ npm add @webview-bridge/web
```

```sh [pnpm]
$ pnpm add @webview-bridge/web zod
```

```sh [yarn]
$ yarn add @webview-bridge/web zod
```

:::



## React Native Part

In React Native, you need to define events in advance and export the types.

::: tip NOTE
Even if you don't define the event schema, you can use postMessage loosely. If the types are not important, you can skip them and just use postMessage.
:::


::: code-group

```tsx [only type]

import { createWebView, postMessageSchema } from "@webview-bridge/react-native";

const appPostMessageSchema = postMessageSchema({
  eventName1: {
    validate: (data) => data as string, // This is not recommended; please use validation libraries like zod or valibot.

  },
  eventName2: {
    validate: (value) => data as { message: string },  // This is not recommended; please use validation libraries like zod or valibot.
  },
});

// Export the event schema to be used in the web application
export type AppPostMessageSchema = typeof appPostMessageSchema;

// When you bridge a webview, a postMessage is extracted.
export const { postMessage } = createWebView({
  postMessageSchema: appPostMessageSchema, // Pass in the your schema. This is optional, so if the type doesn't matter to you, you don't need to include it.
  // ..
});


// usage
postMessage("eventName1", "test");
postMessage("eventName2", {
  message: "test",
});
```

```tsx [zod]
import { createWebView, postMessageSchema } from "@webview-bridge/react-native";
import { z } from "zod";

const appPostMessageSchema = postMessageSchema({
  eventName1: {
    validate: (data) => z.string().parse(data),
  },
  eventName2: {
    validate: (value) => {
      return z.object({ message: z.string() }).parse(value);
    },
  },
});

// Export the event schema to be used in the web application
export type AppPostMessageSchema = typeof appPostMessageSchema;

// When you bridge a webview, a postMessage is extracted.
export const { postMessage } = createWebView({
  postMessageSchema: appPostMessageSchema, // Pass in the your schema. This is optional, so if the type doesn't matter to you, you don't need to include it.
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
  eventName1: {
    validate: (data) => {
      return v.parse(v.string(), value);
    }
  },
  eventName2: {
    validate: (value) => {
      return v.parse(v.object({ message: v.string() }), value);
    },
  }
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


# Broadcast

Due to React Navigation and other factors, there can be multiple instances of a WebView. Sometimes, you may want to send messages to all WebView instances, while at other times, you may only want to target the last WebView instance (e.g., the top of the React Navigation stack).

To send a message to all WebView instances:
```ts
postMessage(..., ...); // Default is true
// or
postMessage(..., ..., { broadcast: true });
```

To send a message only to the last WebView instance:
```ts
postMessage(..., ..., { broadcast: false });
```