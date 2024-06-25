# Using Web Methods in React Native

::: danger IMPORTANT
webMethod is deprecated. You can use postMessage to send events from native to web.

you can check [Using a PostMessage](/using-a-post-message) document
:::


This is a guide on how to use methods declared in a web within React Native.

::: warning WARNING
Maintaining a bidirectional bridge can become challenging due to the need for exporting types. Make sure to actively utilize the [Using a Native Method](/using-a-native-method) document, and thoroughly use the return values from the native methods. If you still face issues after these steps, then consider revisiting this page for further guidance.
:::

## Web Part

Define web-specific methods using `registerWebMethod`.

```tsx
import { registerWebMethod } from "@webview-bridge/web";

// Register functions in the registerWebMethod object in your web code
export const webBridge = registerWebMethod({
  async alert(message: string) {
    window.alert(message);
  },
  async sum(a: number, b: number) {
    return a + b;
  },
  // ... Add more functions as needed
});

// Export the bridge type to be used in the web application
export type WebBridge = typeof webBridge;
```

## React Native Part

In React Native, you can create a WebView using `createWebView` and retrieve webview-specific methods through `linkWebMethod`.

Use the type exported earlier as a generic. Methods can be used normally when `isReady` is true.

```tsx
// When you bridge a webview, a linkWebMethod is extracted.
export const { linkWebMethod } = createWebView({
  // ..
});

const WebMethod = linkWebMethod<WebBridge>();

// When the value of the WebMethod is binding, it is checked with isReady and executed.
if (WebMethod.current.isReady) {
  WebMethod.current.alert("This called from webview");
}

if (WebMethod.current.isReady) {
  WebMethod.current.sum(1, 2).then((result) => setValue(result));
}
```
