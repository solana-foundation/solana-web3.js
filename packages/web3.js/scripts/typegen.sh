set -e

# Generate typescript declarations
tsc -p tsconfig.d.json -d

# Flatten typescript declarations
rollup -c rollup.config.types.mjs

# Format the flattened declaration file. lib/ is in the workspace oxfmt
# config's ignorePatterns, so point at the shared config directly.
oxfmt --config ../../node_modules/@solana-config/oxc/oxfmt.json lib/index.d.ts
