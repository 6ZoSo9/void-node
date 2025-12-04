#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [dev-work-credits-health] VOID Work Credits dev health ==="

# Allow override like: FORGE_MATCH='WorkCredits|RewardEngine' ./ops/dev-work-credits-health.sh
FORGE_MATCH="${FORGE_MATCH:-WorkCredits}"

echo
echo "=== [1] forge test (match-contract: ${FORGE_MATCH}) ==="
set +e
forge test --match-contract "${FORGE_MATCH}" "$@"
rc=$?
set -e

if [ "$rc" -ne 0 ]; then
  echo
  echo "[dev-work-credits-health] RESULT: FAIL (forge rc=${rc}; either tests failing or no matching tests yet)"
  exit "$rc"
fi

echo
echo "[dev-work-credits-health] RESULT: OK (Work Credits test suite passing)"
