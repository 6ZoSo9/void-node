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
grep -q "make buy-void-hardstop-proof" "$RUNBOOK"
grep -q "Payment confirmation is not VOID sent" "$RUNBOOK"
echo "[ok] runbook hard-stop rules present"

echo
echo "=== [2] status proof / Prometheus path ==="
make mainnet0-status-proof

echo
echo "=== [3] Buy VOID hard-stop proof ==="
make buy-void-hardstop-proof

echo
echo "=== [4] go/no-go must fail closed ==="
make mainnet0-gonogo-no-go-proof

echo
echo "=== [5] validator live-admission dry-run proof ==="
make mainnet0-validator-live-admission-dryrun-proof

echo
echo "=== [6] cross-box smoke ==="
make mainnet0-crossbox-status-smoke

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "prelaunch_safety": "green",
  "launch_state": "not_go_for_public_mainnet0",
  "go_no_go": "fails_closed",
  "validator_live_admission": "blocked",
  "validator_live_admission_dryrun": "green",
  "buy_void_hardstop": "green",
  "buy_void_claim_send": "blocked",
  "buy_void_payment_confirmed_no_void_send": "green",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 prelaunch safety proof passed"
