# Using Web Methods in React Native

This is a guide on how to use methods declared in a web within React Native.

::: warning IMPORTANT
Maintaining a bidirectional bridge can become challenging due to the need for exporting types. Make sure to actively utilize the [Using a Native Method](/using-a-native-method) document, and thoroughly use the return values from the native methods. If you still face issues after these steps, then consider revisiting this page for further guidance.
:::

## Web Part

Define web-specific methods using `registerWebMethod`.

```tsx
import { linkNativeMethod, registerWebMethod } from "@rnbridge/web";

// Register functions in the registerWebMethod object in your web code
export const webBridge = registerWebMethod({
  alert: (message: string) => {
    window.alert(message);
  },
  sum: (a: number, b: number) => {
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