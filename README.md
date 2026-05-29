[![npm][npm-image]][npm-url]
[![npm-downloads][npm-downloads-image]][npm-url]
[![semantic-release][semantic-release-image]][semantic-release-url]
<br />
[![code-style-prettier][code-style-prettier-image]][code-style-prettier-url]

[code-style-prettier-image]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square
[code-style-prettier-url]: https://github.com/prettier/prettier
[npm-downloads-image]: https://img.shields.io/npm/dm/@solana/web3.js.svg?style=flat
[npm-image]: https://img.shields.io/npm/v/@solana/web3.js.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@solana/web3.js
[semantic-release-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release

> [!NOTE]
> This branch tracks the v3 line of `@solana/web3.js`. It keeps the familiar class-based API, updates it for the latest RPC methods, and rebuilds the internals on Solana Kit.

# Solana JavaScript SDK (v3)

Use this to interact with accounts and programs on the Solana network through the Solana [JSON RPC API](https://solana.com/docs/rpc).

## Installation

### For use in Node.js or a web application

```shell
$ npm install @solana/web3.js@rc
```

```shell
$ pnpm add @solana/web3.js@rc
```

```shell
$ bun add @solana/web3.js@rc
```

```shell
$ yarn add @solana/web3.js@rc
```

### For use in a browser, without a build system

```html
<!-- Development (un-minified) -->
<script src="https://unpkg.com/@solana/web3.js@rc/lib/index.iife.js"></script>

<!-- Production (minified) -->
<script src="https://unpkg.com/@solana/web3.js@rc/lib/index.iife.min.js"></script>
```

The `@rc` tag always resolves to the latest release candidate. For production, pin browser bundles to an exact published version instead, and update the version when a newer v3 release is published.

## Documentation and examples

- [The Solana Cookbook](https://solanacookbook.com/) has extensive task-based documentation using this library.
- For more detail on individual functions, see the [latest API Documentation](https://solana-foundation.github.io/solana-web3.js)
- For applications upgrading to v3, see the [web3.js v1 → v3 migration guide](docs/web3js-v1-to-v3-migration.md).

## v3 Migration Assistance
This repository includes a reusable agent skill for upgrading applications from
`@solana/web3.js` v1 to v3:

- Human-facing guide: [`docs/web3js-v1-to-v3-migration.md`](docs/web3js-v1-to-v3-migration.md)
- [`skills/web3js-v1-to-v3-migration/SKILL.md`](skills/web3js-v1-to-v3-migration/SKILL.md)

You can install it locally from a checkout:

```shell
$ npx skills add ./skills/web3js-v1-to-v3-migration
```

Or install it directly from the repository:

```shell
$ npx skills add https://github.com/solana-foundation/solana-web3.js/tree/v3.x/skills/web3js-v1-to-v3-migration
```

## Getting help

Have a question or a problem? Check the [Solana Stack Exchange](https://solana.stackexchange.com) to see if anyone else is having the same one. If not, [post a new question](https://solana.stackexchange.com/questions/ask).

Include:

- A detailed description of what you're trying to achieve
- Source code, if possible
- The text of any errors you encountered, with stacktraces if available

## Compatibility

`@solana/web3.js` v3 publishes separate builds for Node.js, browsers, and React Native.

- Node.js: supported on Node 20.18.0 or newer. This matches the package `engines` field and is the runtime floor the project tests against.
- Browsers: supported in modern evergreen browsers with [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) support. The distributed browser bundles target modern JavaScript engines; older browsers are not a compatibility target unless your application transpiles and polyfills this package itself.
- React Native: supported on runtimes with `BigInt` support, such as [Hermes](https://reactnative.dev/blog/2022/07/08/hermes-as-the-default).
- Other runtimes: may work if they provide the required language features and web APIs, but they are not part of the supported compatibility contract.

If you are loading the IIFE bundle directly in a page, treat it as a modern-browser build rather than a legacy compatibility bundle.

## Development environment setup

This repository is developed against Node.js 20.18.0 or newer and uses `pnpm` for local development.

To install dependencies:

```shell
$ pnpm install
```

### Testing

#### Unit tests

To run the full suite of unit tests, execute the following in the root:

```shell
$ pnpm test:unit
```

#### Integration tests

Integration tests require a validator client running on your machine.

To install a test validator:

```shell
$ pnpm test:live-with-test-validator:setup
```

To start the test validator and run all of the integration tests in live mode:

```shell
$ pnpm test:live-with-test-validator
```

Other useful development commands:

- `pnpm test:typecheck` runs the TypeScript typechecker without emitting files.
- `pnpm test:lint` runs ESLint over `src/` and `test/`.
- `pnpm test:lint:fix` applies autofixable ESLint changes.
- `pnpm test:prettier` checks formatting across the repository.
- `pnpm test:prettier:fix` rewrites files to match the configured Prettier style.
- `pnpm dev` rebuilds in watch mode while you are working locally.
- `pnpm compile:js` produces the distributable JavaScript bundles.
- `pnpm compile:docs` regenerates the API documentation.

## Contributing

If you found a bug or would like to request a feature, please [file an issue](https://github.com/solana-foundation/solana-web3.js/issues/new). If, based on the discussion on an issue you would like to offer a code change, please make a [pull request](https://github.com/solana-foundation/solana-web3.js/compare). If neither of these describes what you would like to contribute, read the [getting help](#getting-help) section above.

## Disclaimer

All claims, content, designs, algorithms, estimates, roadmaps,
specifications, and performance measurements described in this project
are done with the Solana Foundation's ("SF") best efforts. It is up to
the reader to check and validate their accuracy and truthfulness.
Furthermore nothing in this project constitutes a solicitation for
investment.

Any content produced by SF or developer resources that SF provides, are
for educational and inspiration purposes only. SF does not encourage,
induce or sanction the deployment, integration or use of any such
applications (including the code comprising the Solana blockchain
protocol) in violation of applicable laws or regulations and hereby
prohibits any such deployment, integration or use. This includes use of
any such applications by the reader (a) in violation of export control
or sanctions laws of the United States or any other applicable
jurisdiction, (b) if the reader is located in or ordinarily resident in
a country or territory subject to comprehensive sanctions administered
by the U.S. Office of Foreign Assets Control (OFAC), or (c) if the
reader is or is working on behalf of a Specially Designated National
(SDN) or a person subject to similar blocking or denied party
prohibitions.

The reader should be aware that U.S. export control and sanctions laws
prohibit U.S. persons (and other persons that are subject to such laws)
from transacting with persons in certain countries and territories or
that are on the SDN list. As a project based primarily on open-source
software, it is possible that such sanctioned persons may nevertheless
bypass prohibitions, obtain the code comprising the Solana blockchain
protocol (or other project code or applications) and deploy, integrate,
or otherwise use it. Accordingly, there is a risk to individuals that
other persons using the Solana blockchain protocol may be sanctioned
persons and that transactions with such persons would be a violation of
U.S. export controls and sanctions law. This risk applies to
individuals, organizations, and other ecosystem participants that
deploy, integrate, or use the Solana blockchain protocol code directly
(e.g., as a node operator), and individuals that transact on the Solana
blockchain through light clients, third party interfaces, and/or wallet
software.
