#!/usr/bin/env bash
set -euo pipefail

echo "=== [wc-ci-smoke] VOID Work Credits CI smoke ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo
echo "=== [wc-ci-smoke] 1) WorkCreditsToken tests ==="
forge test \
  --match-path test/WorkCreditsToken.t.sol \
  --match-contract WorkCreditsTokenTest

echo
echo "=== [wc-ci-smoke] 2) WorkCreditsMinter tests ==="
forge test \
  --match-path test/mainnet/WorkCreditsMinter.t.sol \
  --match-contract WorkCreditsMinterTest

echo
echo "=== [wc-ci-smoke] 3) WorkCreditsRelayerHelper tests ==="
forge test \
  --match-path test/mainnet/WorkCreditsRelayerHelper.t.sol \
  --match-contract WorkCreditsRelayerHelperTest

echo
echo "=== [wc-ci-smoke] RESULT: OK (all WC test suites passed) ==="
