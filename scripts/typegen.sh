set -e

# Generate typescript declarations
tsc -p tsconfig.d.json -d

# Flatten typescript declarations
rollup -c rollup.config.types.mjs

# Run prettier
prettier --write lib/index.d.ts
