#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== Mainnet-0 prelaunch safety proof ==="

echo
echo "=== [1] runbook hard-stop rules ==="
RUNBOOK="ops/mainnet/mainnet0-prelaunch-safety-runbook.md"
test -f "$RUNBOOK"
grep -q "make mainnet0-prelaunch-safety-proof" "$RUNBOOK"
grep -q "If the proof fails, stop." "$RUNBOOK"
grep -q "The money step remains last." "$RUNBOOK"
grep -q "Do not run Buy VOID MODE=claim" "$RUNBOOK"
echo "[ok] runbook hard-stop rules present"

echo
echo "=== [2] status proof / Prometheus path ==="
make mainnet0-status-proof

echo
echo "=== [3] go/no-go must fail closed ==="
make mainnet0-gonogo-no-go-proof

echo
echo "=== [4] cross-box smoke ==="
make mainnet0-crossbox-status-smoke

echo
echo "=== [5] summary ==="
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
