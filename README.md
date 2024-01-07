# rnbridge

[![NPM](https://img.shields.io/npm/v/%40rnbridge%2Fnative/latest?label=%40rnbridge%2Fnative)](https://www.npmjs.com/package/@rnbridge/native)
[![NPM](https://img.shields.io/npm/v/%40rnbridge%2Fweb/latest?label=%40rnbridge%2Fweb)](https://www.npmjs.com/package/@rnbridge/web)

`rnbridge` is a powerful interface that acts as a bridge between React Native and web applications using `react-native-webview`. It providing seamless interaction and ensuring type safety.

Inspired by the functionality of `tRPC`, `rnbridge` simplifies the communication process between `react-native-webview` and web applications.

**Key Features:**
- Built upon `react-native-webview`.
- Designed with zero external dependencies (except for `react-native-webview`).
- Type-Safety
- Backward Compatibility
- No App Review Needed

![rnbridge](https://github.com/gronxb/rnbridge/assets/41789633/a93e6439-f410-42ac-bc4b-b8f32213a537)


## Documentation
visit [Docs](https://gronxb.github.io/rnbridge)

## Example
visit [Example](https://github.com/gronxb/rnbridge-example)

## Exporting Type Declarations
To enhance your experience with rnbridge, it's recommended to export the type declaration of the native bridge object to the web application. Here are a few ways to achieve this:

1. [Monorepo Setup (Recommended)](https://gronxb.github.io/rnbridge/exporting-type-declarations/monorepo): Use a monorepo setup to export the type of the native bridge.
2. [Custom Declaration File](https://gronxb.github.io/rnbridge/exporting-type-declarations/custom-declaration-file): Build a bridge declaration file using tsc and move the file as needed.
3. Private npm Registry: Utilize a private npm registry to export the type of the native bridge.


## Contributor Guide

If you would like to contribute to rnbridge by submitting bug fixes or performance improvements, please refer to our [CONTRIBUTING.md](https://github.com/brandazine/rnbridge/blob/main/CONTRIBUTING.md) guide for detailed instructions. We welcome and appreciate your contributions.
