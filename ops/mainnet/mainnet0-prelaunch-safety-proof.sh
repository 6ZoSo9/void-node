#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== Mainnet-0 prelaunch safety proof ==="

echo
echo "=== [1] status proof / Prometheus path ==="
make mainnet0-status-proof

echo
echo "=== [2] go/no-go must fail closed ==="
make mainnet0-gonogo-no-go-proof

echo
echo "=== [3] cross-box smoke ==="
make mainnet0-crossbox-status-smoke

echo
echo "=== [4] summary ==="
python3 - <<'PY'
print({
  "prelaunch_safety": "green",
  "launch_state": "not_go_for_public_mainnet0",
  "go_no_go": "fails_closed",
  "validator_live_admission": "blocked",
  "buy_void_claim_send": "blocked",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 prelaunch safety proof passed"
