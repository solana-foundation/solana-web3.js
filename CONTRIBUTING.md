# Contributing

Thanks for helping improve `@solana/web3.js`.

## Before you start

- Search existing issues and pull requests before opening a new one.
- Open an issue first and wait for a maintainer to label it `accepted`. Every pull request has to reference such an issue with `Fixes #<issue>`; CI labels the ones that don't `needs-issue` and closes them, with the exception of typos, broken links, and comment-only fixes, which declare `Linked issue: trivial` in the description instead. Agreeing on the approach before anyone writes code is what keeps a finished change from being rejected on scope. Small PRs are preferred.
- Do not include secrets, private keys, seed phrases, or production credentials in issues, pull requests, commits, logs, or screenshots.
- All commits into a Solana Foundation repository require [commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) to be enabled. CI requests changes on a PR carrying an unverified commit and dismisses that review once every commit verifies.

## Security vulnerabilities

Do not report security vulnerabilities in public issues. Follow this repository's [security policy](./SECURITY.md).

## Development setup

Install [Just](https://github.com/casey/just) (`brew install just`), then:

```shell
just setup
```

Use `just` rather than calling the underlying pnpm scripts by hand. The recipes fan out across every workspace package and handle the local test validator for you.

```shell
just build      # bundle JavaScript and generate type definitions
just test       # unit tests across every package
just fmt-fix    # format with auto-fix
just lint-fix   # lint with auto-fix
```

Run `just -l` to list every recipe. Running `just` with no arguments runs the default recipe: format, lint, typecheck, build, and unit tests.

Use the toolchain versions checked into the repository. Do not update Node, pnpm, or the `@solana/kit` dependency majors as an incidental part of another change.

## Making a change

Keep changes focused. A pull request should solve one problem and include the tests and documentation needed to keep the repository usable.

Before opening a pull request:

```shell
just ci
```

This runs exactly what CI runs on a pull request: formatting, type definitions, lint, bundling, smoke tests, unit tests, and the integration tests against a local validator. Fix any failures before pushing.

Also:

- Add or update tests when behavior changes.
- Update documentation and examples when they are part of the user-facing contract.
- Explain any new dependency and why the existing dependency set is insufficient.

## Pull requests

Fill in every section of the pull request template: the linked issue, the problem, the approach, how you tested it, and the [AI disclosure](#disclosure). Call out behavior changes, compatibility concerns, or follow-up work. CI fails the PR until the disclosure is declared.

Name commits using [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope][!]: <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Use imperative mood, lowercase, no trailing period. Breaking changes get a `!` after the type and a `BREAKING CHANGE:` footer.

By default, [Greptile](https://www.greptile.com) is enabled on all Solana Foundation repositories. Before maintainers review, all Greptile comments must be resolved with either a code fix or an explanation of why no change is needed.

Once CI is approved to run by maintainers, all CI errors must be addressed before the PR will be merged.

Maintainers may ask you to rebase, split a broad change, add tests, or revise documentation before merging.

## AI use

You may use AI-assisted tools, but you should review the generated code, understand its behavior, and run the same checks expected of any other contribution.

If you are building with AI on Solana, check out the [Solana Dev Skill](https://github.com/solana-foundation/solana-dev-skill) or the [Solana MCP](https://mcp.solana.com/) to aid in your work.

Ensure that the generated code adheres to the project's coding standards and best practices. Maintainers can close PRs if they appear to be low-effort AI slop. In particular, audit your changes for the following AI code smells that increase maintenance burden:

- Comments that explain why the _previous_ behavior was wrong and the new behavior is correct. This can be helpful context for reviewers as a GitHub comment in the review, but we do not need a history of every code change living in the codebase.
- Large blocks of comments with high density of technical jargon; comments should be distilled to clearly explain _why_ this code is doing something (if it's not obvious), not _what_ (the code should speak for itself).
- Drive-by refactoring of code that is not relevant to the actual change being made.

Be especially careful with AI-generated tests. A test that asserts a function rejects invalid input is worthless if it would pass against a function that rejects everything — assert the accepted case too, and make sure the test would actually fail if the behavior it covers were broken.

You must be able to explain every line of your diff without an LLM. Reviewers may ask you a pointed question about any part of the change; if the answer is pasted from a model or does not come, the PR is closed.

Tool attribution left in a PR (a `Generated with Claude Code` footer, a `Co-Authored-By: Claude` trailer, a `cursor/` or `codex/` branch, and the like) tells us the submission was opened without being read. CI labels these `ai-unreviewed`, fails the check, and explains what to fix. PRs left in that state are closed.

### Disclosure

Disclosure is required. The pull request template has two boxes; check exactly one. If AI tooling was used, name the tool and the extent, for example:

> I wrote all of the code for this feature, and had Claude update the documentation and create tests accordingly

or

> I architected the change and handed all implementation over to Codex

Editor autocomplete of single keywords or short phrases does not count as AI tooling.

### Communication

If maintainers have suggested changes, feedback, or questions about your code, you should not be copy/pasting the questions to an LLM and copy/pasting the response. You being able to distill the information that AI produces is what makes your contribution valuable.

## License

By contributing, you agree that your contributions are licensed under the project's [LICENSE](./LICENSE).
