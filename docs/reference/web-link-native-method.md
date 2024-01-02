# linkNativeMethod

The `linkNativeMethod` is used to access methods set up in the React Native bridge.

## Options 

| Prop             | Type                           | Required | Default | Description                                                                 |
|------------------|--------------------------------|----------|---------|---------------------------------------------------------------------------|
| `timeout`         | number                         | false | 2000 | Specifies the maximum time (in milliseconds) to wait for a response from the native code before timing out.                  |
| `throwOnError`          | boolean \| T[]                        | false | false | Determines whether to throw an error if the native method call fails. Default is false.                                          |
| `onFallback`       | (method: T) => void      | false | X |This event is triggered when a method is executed but not found in native, with the executed method passed as an argument.         |