#!/usr/bin/env bash
(
    set -e
    version=$(node -e \
      'fetch("https://api.github.com/repos/anza-xyz/agave/releases").then(res => res.json().then(rs => rs.filter(r => !r.prerelease && r.tag_name.startsWith("v2.1."))).then(x => console.log(x[0].tag_name)));'
    )
    if [ -z $version ]; then
      exit 3
    fi
    echo $version
)
errorCode=$?
if [ $errorCode -ne 0 ]; then
  # Bust the cache with a timestamp if no version could be found.
  echo $(date +%s)
fi