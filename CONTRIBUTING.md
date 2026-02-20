## Contributor Guide

Welcome to the project's contributor guide! This document will provide you with essential information and guidelines for contributing to our software development process. We highly value your expertise and contributions to our project, and we appreciate your commitment to enhancing the codebase.

## Examples

To help you get started quickly, we have provided several examples in the example folder. These examples demonstrate the usage and capabilities of our software. We encourage you to explore them and leverage the insights gained to enhance your understanding of our project's functionality.

If the files in `packages/*` have changed, you will need to do `pnpm -w build`.

## Setup

```sh
$ corepack enable
$ pnpm install
$ pnpm build:dev
```

## React Native (iOS) Start

```sh
$ cd example/native-method/react-native
$ pnpx pod-install
$ pnpm ios
$ pnpm start --reset-cache
```

## Web Start

```sh
$ cd example/native-method/react
$ pnpm dev
```

## Developing
Change the code and enter the command below to apply the code.

```sh
$ pnpm -w build
```

## Changeset Guide

If you changed anything under `packages/*`, create a changeset before opening a PR.

```sh
$ pnpm changeset
```

Select changed package(s), then choose:

- `patch`: bug fixes, backward-compatible improvements
- `minor`: new backward-compatible features
- `major`: breaking changes

Commit the generated markdown file under `.changeset`.

## Release Process

Release automation runs on pushes to `main` through `.github/workflows/release.yml`.

1. If changeset files exist, Changesets Action opens a version PR with updated package versions/changelog.
2. After that version PR is merged into `main`, the same workflow publishes packages via `pnpm publish:all` (`nx release publish`).

PR builds also publish preview packages to `pkg.pr.new` through `.github/workflows/pkg-pr-new.yml`.
