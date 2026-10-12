#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

WRAPPER="ops/mainnet0-go-no-go-with-validator-lifecycle.sh"
LOG="/tmp/void-mainnet0-gonogo-no-go-proof.log"

echo "=== Mainnet-0 go/no-go NO-GO proof ==="

echo
echo "=== [1] required wrapper ==="
test -x "$WRAPPER" || test -f "$WRAPPER"
bash -n "$WRAPPER"
echo "[ok] wrapper exists and syntax is valid"

echo
echo "=== [2] run wrapper and require rc=2 ==="
set +e
bash "$WRAPPER" > "$LOG" 2>&1
RC=$?
set -e

tail -120 "$LOG"
echo "rc=$RC"

test "$RC" = "2"
grep -q "\[NO-GO\] Mainnet-0 public launch is intentionally blocked" "$LOG"
grep -q "Ready/update/lifecycle checks are green, but launch approval is still false" "$LOG"
grep -Eq "Remaining blockers include .*public validator promotion|public validator promotion" "$LOG"

echo "[ok] wrapper fails closed with expected NO-GO rc=2"

echo
echo "=== [3] prove blockers independently ==="
make mainnet0-blockers-proof

echo
echo "=== [4] summary ==="
python3 - <<'PY'
print({
  "go_no_go_wrapper": "fails_closed",
  "expected_rc": 2,
  "launch_state": "not_go_for_public_mainnet0",
  "public_validator_promotion": "blocked",
  "buy_void_claim_send": "blocked",
})
PY

echo
echo "[ok] Mainnet-0 go/no-go NO-GO proof passed"
