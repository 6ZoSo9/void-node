#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [wc-contracts-smoke] repo ==="
pwd

echo
echo "=== [wc-contracts-smoke] forge test (workcredits subset) ==="
forge test --match-path 'test/workcredits/*.t.sol' -vvv
