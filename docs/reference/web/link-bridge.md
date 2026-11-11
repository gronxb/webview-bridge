# linkBridge

The `linkBridge` is used to access methods set up in the React Native bridge.

## Options 

| Prop             | Type                           | Required | Default | Description                                                                 |
|------------------|--------------------------------|----------|---------|---------------------------------------------------------------------------|
| `timeout`         | number                         | false | 2000 | Maximum time (in milliseconds) to wait for native to acknowledge a call. Once acknowledged, the call waits for the method's result with no time limit. With native builds before 1.9.0, it limits the whole call. `0` disables it. |
| `throwOnError`          | boolean \| T[]                        | false | false | Determines whether to throw an error if the native method call fails. Default is false.                                          |
| `onFallback`       | (methodName: T, args: unknown[]) => void      | false | X |This event is triggered when a method is executed but not found in native, with the executed method passed as an argument.         |
| `onReady`       | (method: NativeMethod) => void      | false | X | Runs when the native method is ready to use.