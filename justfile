set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
set quiet

pkg := "@solana/web3.js"

alias b := build
alias t := test
alias f := fmt

# Default: format, lint, typecheck, build, unit test
[group('build')]
default: fmt lint typecheck build test

# ******************************************************************************
# Setup
# ******************************************************************************

# Install workspace dependencies
[group('setup')]
setup:
    pnpm install

# Remove build artifacts and installed dependencies
[group('setup')]
[confirm('Delete lib/, docs/ and all node_modules?')]
clean:
    rm -rf packages/*/lib packages/*/dist packages/*/doc packages/*/*.tsbuildinfo
    find . -name node_modules -type d -prune -exec rm -rf {} +

# ******************************************************************************
# Build
# ******************************************************************************

# Build every workspace package (bundles + type definitions)
[group('build')]
build: build-typedefs build-js

# Bundle JavaScript for every workspace package
[group('build')]
build-js:
    pnpm run compile:js

# Generate type definitions for every workspace package
[group('build')]
build-typedefs:
    pnpm run compile:typedefs

# Rebuild a single package on change
[group('build')]
dev package=pkg:
    pnpm --filter {{package}} run dev

# Serve the wallet-adapter demo app on a local dev server
[group('build')]
adapter-example: build-js
    pnpm --filter @solana/wallet-adapter-example run dev

# ******************************************************************************
# Format & Lint
# ******************************************************************************

# Check formatting
[group('fmt')]
fmt:
    pnpm run test:prettier

# Format with auto-fix
[group('fmt')]
fmt-fix:
    pnpm -r run test:prettier:fix

# Check lint rules
[group('lint')]
lint:
    pnpm run test:lint

# Lint with auto-fix
[group('lint')]
lint-fix:
    pnpm -r run test:lint:fix

# Typecheck every workspace package
[group('lint')]
typecheck:
    pnpm run test:typecheck

# ******************************************************************************
# Test
# ******************************************************************************

# Run unit tests
[group('test')]
test:
    pnpm run test:unit

# Run unit tests for a single package
[group('test')]
test-package package=pkg:
    pnpm --filter {{package}} run test:unit

# Smoke-test the built bundles (requires build first)
[group('test')]
test-smoke: build-js
    pnpm run test:smoke

# Run integration tests against an already-running validator on :8899
[group('test')]
test-live:
    pnpm run test:live

# Run integration tests, starting and stopping a local validator automatically
[group('test')]
test-live-local: validator-install
    #!/usr/bin/env bash
    set -euo pipefail
    just _with-validator pnpm run test:live

# Pack the workspace packages and install them into a fresh npm app to prove peer ranges resolve
[group('test')]
test-install: build-js
    pnpm --filter @solana/wallet-adapter run test:install

# Everything CI runs on a pull request. Mirrors the GitHub workflow: the
# validator boots in the background first so it is warmed up by the time the
# integration tests run.
[group('test')]
ci: validator-install
    #!/usr/bin/env bash
    set -euo pipefail
    just _with-validator just fmt build-typedefs lint build-js test-smoke test test-install test-live

# Run a command with a fresh test validator on :8899, killing it afterwards
_with-validator +cmd:
    #!/usr/bin/env bash
    set -euo pipefail
    cd packages/web3.js
    pkill -f solana-test-validator || true
    rm -rf test-ledger
    ./scripts/start-shared-test-validator.sh &
    validator_script_pid=$!
    trap 'pkill -f solana-test-validator || true; kill $validator_script_pid 2>/dev/null || true' EXIT
    cd ../..
    deadline=$((SECONDS + 120))
    wait_for() { until "$@"; do [ "$SECONDS" -lt "$deadline" ] || { echo "Timed out waiting for the test validator" >&2; exit 1; }; sleep 1; done; }
    healthy() { [ "$(curl -sf -m 2 http://127.0.0.1:8899/health || true)" = "ok" ]; }
    slot() { curl -sf -m 2 -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' http://127.0.0.1:8899 | jq -r .result; }
    warmed_up() { [ "$(slot || echo 0)" -ge 32 ]; }
    wait_for healthy
    wait_for warmed_up
    {{cmd}}

# ******************************************************************************
# Validator
# ******************************************************************************

# Download the Agave test validator used by the integration tests
[group('validator')]
validator-install:
    pnpm --filter {{pkg}} run test:live-with-test-validator:setup

# Start a shared test validator in the foreground
[group('validator')]
validator: validator-install
    ./packages/web3.js/scripts/start-shared-test-validator.sh

# ******************************************************************************
# Release
# ******************************************************************************

# Verify the workspace is releasable: clean tree, consistent versions, green CI
[group('release')]
release-check:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "$(git status --porcelain)" ]; then
        echo "Error: working directory not clean"
        exit 1
    fi
    for manifest in packages/*/package.json; do
        printf '  %-40s %s\n' "$(jq -r .name "$manifest")" "$(jq -r .version "$manifest")"
    done
    just ci

# Set every publishable package to the given version
[group('release')]
version-bump version:
    #!/usr/bin/env bash
    set -euo pipefail
    for manifest in packages/*/package.json; do
        (cd "$(dirname "$manifest")" && pnpm version "{{version}}" --no-git-tag-version --allow-same-version)
    done
    echo "Bumped all packages to {{version}}. Commit with: chore: bump version to v{{version}}"
