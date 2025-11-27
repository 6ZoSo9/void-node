#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "[mainnet-dryrun] repo=$(pwd)"

# List of health hammers to run in order.
# We only run those that exist AND are executable.
SCRIPTS=(
  "./ops/void-mainnet-health-all.sh"
  "./ops/void-mainnet-tokenomics-health-all.sh"
  "./ops/void-mainnet-reward-health-all.sh"
  "./ops/void-mainnet-keys-health-all.sh"
)

i=0
for s in "${SCRIPTS[@]}"; do
  i=$((i+1))
  if [[ -x "$s" ]]; then
    echo
    echo "=== [$i] running $s ==="
    if ! "$s"; then
      echo "[mainnet-dryrun] ERROR: $s failed"
      exit 1
    fi
  else
    echo
    echo "=== [$i] skipping $s (not found or not executable) ==="
  fi
done

echo
echo "[mainnet-dryrun] ALL PRESENT CHECKS PASSED"
