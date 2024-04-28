# Backward Compatibility for New Method

Since a WebView is web-based, it can always be updated to the latest version upon deployment. In contrast, rolling out updates for a React Native app can take time.

When a new method is added in React Native, it can be invoked from the web.

However, if the React Native App is not the latest version, this may lead to errors.

`webview-bridge` can be used for appropriate failover.

## Web Part

### throwOnError

On the web, methods registered above are retrieved through `linkBridge`. If you set the `throwOnError` option to `true`, an error will be thrown when the method is absent.

```tsx
const bridge = linkBridge<AppBridge>({
  throwOnError: true,
});
```

Handling can be done as follows:

```tsx
<button
  onClick={() => {
    bridge
      .openInAppBrowser("https://github.com/gronxb/webview-bridge")
      .then(() => {
        console.log("Success");
      })
      .catch((e) => {
        if (e instanceof MethodNotFoundError) {
          // This is where you can do failover.
          console.log("Method not found");
          alert("The app is outdated. Please update.");
        }
      });
  }}
>
  Open InAppBrowser
</button>
```

::: tip NOTE
Typically, to avoid halting app functionality, the default value for `throwOnError` is false. In this case, it is executed as `console.warn`.
:::

### throwOnError selector

`throwOnError` can be set globally as a boolean value. However, it also allows for selective error throwing by specifying an array of method names.

#### Try the following:

```javascript
// Setting throwOnError globally
const bridge = linkBridge<AppBridge>({
  throwOnError: true,
});

// Selective error throwing using method names
const bridge = linkBridge<AppBridge>({
  throwOnError: ["openInAppBrowser", /* other method */],
});
```

### onFallback

The `onFallback` method can be used for batch processing of errors. It's suitable for displaying messages like "Please update the app," or for handling all situations where native methods cannot be used.

```tsx
const bridge = linkBridge<AppBridge>({
  onFallback: (methodName, args) => {
    alert("The app is outdated. Please update.");

    // Backward compatibility
    if(methodName === "sum") {
      bridge.loose.oldSum(...args);
    }
  },
});
```

## React Native Part

For example, it's configured as follows. You can handle this through the `createWebView` fallback field.

```tsx
export const appBridge = bridge({
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
});

export const { WebView, linkWebMethod } = createWebView({
  bridge: appBridge,
  debug: true,

  // In this field, the method name called from the web is passed.
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});
```

When a method not present on the web is called, the fallback function is executed. In this case, the method name called from the web is passed.

This field can be useful for tracking errors with tools like `Sentry`.
