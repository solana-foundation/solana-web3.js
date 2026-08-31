#!/usr/bin/env bash
(
    set -euo pipefail
    version=$(node -e '
      (async () => {
        const stableTag = /^v\d+\.\d+\.\d+$/;
        const response = await fetch("https://api.github.com/repos/anza-xyz/agave/releases?per_page=100");
        if (!response.ok) {
          throw new Error(`GitHub releases request failed with status ${response.status}`);
        }
        const version = (await response.json())
          .map(({draft, prerelease, tag_name}) =>
            !draft && !prerelease && stableTag.test(tag_name) ? tag_name : null,
          )
          .filter(Boolean)
          .sort((left, right) =>
            left.localeCompare(right, undefined, {numeric: true}),
          )
          .pop();
        if (!version) {
          throw new Error("No stable Agave release tag found");
        }
        console.log(version);
      })().catch(error => {
        console.error(error);
        process.exit(1);
      });
    ')
    if [ -z "$version" ]; then
      exit 3
    fi
    echo "$version"
)
errorCode=$?
if [ "$errorCode" -ne 0 ]; then
  # Bust the cache with a timestamp if no version could be found.
  echo "$(date +%s)"
fi