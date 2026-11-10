set -e

# Generate typescript declarations
tsc -p tsconfig.d.json -d

# Flatten typescript declarations
rolldown -c rolldown.config.types.mjs
