#!/bin/bash
set -e

SCRIPTS_DIR=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
HEALTH_TIMEOUT_SECONDS=${TEST_VALIDATOR_HEALTH_TIMEOUT_SECONDS:-120}

set -m
"$SCRIPTS_DIR/start-shared-test-validator.sh" &
validator_script_pid=$!
set +m
trap 'kill -- -$validator_script_pid 2>/dev/null' EXIT

deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
until curl -sf http://127.0.0.1:8899/health >/dev/null; do
  if ! kill -0 $validator_script_pid 2>/dev/null; then
    echo "ERROR: Test validator exited before becoming healthy" >&2
    exit 1
  fi
  if (( SECONDS >= deadline )); then
    echo "ERROR: Test validator did not become healthy within ${HEALTH_TIMEOUT_SECONDS}s" >&2
    exit 1
  fi
  sleep 1
done

pnpm test:live
