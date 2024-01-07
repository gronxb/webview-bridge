# createWebView
The `createWebView` is used to create a WebView with an interface that enables communication with the web.

## Options 

| Prop             | Type                           | Required | Default | Description                                                                 |
|------------------|--------------------------------|----------|---------|-----------------------------------------------------------------------------|
| `bridge`         | Object                         | true     | X       | Represents the bridge between React Native and the WebView.                  |
| `debug`          | boolean                        | false    | false   | Outputs console.log from the web in React Native.                                          |
| `responseTimeout`| number                         | false    | 2000    | Timeout duration when executing web methods.                   |
| `fallback`       | (method: keyof T) => void      | false    | X       |Callback function called when a method from the bridge is not found.         |