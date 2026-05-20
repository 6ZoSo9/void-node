#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-validator-live-admission-execution-runbook.md"

echo "=== Mainnet-0 validator live-admission execution runbook proof ==="

echo
echo "=== [1] required doc exists ==="
test -f "$DOC"
echo "[ok] runbook exists"

echo
echo "=== [2] plan-only / non-mutating markers ==="
grep -q "status: plan_only" "$DOC"
grep -q "launch_state: not_go_for_public_mainnet0" "$DOC"
grep -q "mutation_allowed_by_this_doc: false" "$DOC"
grep -q "It is not an execution approval." "$DOC"
grep -q "It does not activate a validator." "$DOC"
grep -q "It does not mutate live validator state." "$DOC"
grep -q "It does not clear the Buy VOID blocker." "$DOC"
grep -q "Do not execute live admission yet." "$DOC"
echo "[ok] runbook is explicitly plan-only and non-mutating"

echo
echo "=== [3] exact candidate / epoch / intent ==="
grep -q "candidate: vault126" "$DOC"
grep -q "target_epoch: 128" "$DOC"
grep -q "expected_validator_count: 127" "$DOC"
grep -q "operator_intent: ADMIT_vault126_EPOCH_128_COUNT_127" "$DOC"
grep -q "expected_candidate=vault126" "$DOC"
grep -q "expected_target_epoch=128" "$DOC"
grep -q "expected_validator_count=127" "$DOC"
grep -q "operator_intent=ADMIT_vault126_EPOCH_128_COUNT_127" "$DOC"
echo "[ok] runbook locks exact future intent values"

echo
echo "=== [4] required proofs are listed ==="
grep -q "make mainnet0-validator-next-onboard-live-gate-proof" "$DOC"
grep -q "make mainnet0-validator-live-admission-readiness-proof" "$DOC"
grep -q "make mainnet0-status-proof" "$DOC"
grep -q "make mainnet0-crossbox-status-smoke" "$DOC"
grep -q "make mainnet0-prelaunch-safety-proof" "$DOC"
echo "[ok] required preflight proofs listed"

echo
echo "=== [5] hard stops are listed ==="
grep -q "selector is not vault126 / epoch128 / expected count 127" "$DOC"
grep -q "missing or mismatched operator intent" "$DOC"
grep -q "live env switch appears persistent outside the guarded command" "$DOC"
grep -q "private key or secret appears in git diff" "$DOC"
grep -q "Buy VOID status is accidentally changed" "$DOC"
grep -q "launch_state changes away from not_go_for_public_mainnet0" "$DOC"
echo "[ok] hard stops listed"

echo
echo "=== [6] no accidental executable shell approval ==="
python3 - "$DOC" <<'PY'
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text()
bad = [
    "export VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1",
    "curl -X POST",
    "curl -sS -X POST",
    "systemctl --user set-environment VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1",
    "launch_state: go",
    "public_mainnet0_approved",
]
found = [x for x in bad if x in text]
assert not found, found
assert "VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1" in text
assert "The live switch must not be persistent" in text
print("[ok] runbook describes the live switch but does not execute or persist it")
PY

echo
echo "=== [7] current live-gate proof still passes ==="
make mainnet0-validator-next-onboard-live-gate-proof

echo
echo "=== [8] status smoke still passes ==="
make mainnet0-status-smoke

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "live_admission_execution_runbook": "green",
  "status": "plan_only",
  "mutation_allowed_by_this_doc": False,
  "candidate": "vault126",
  "target_epoch": 128,
  "expected_validator_count": 127,
  "live_admission_executed": False,
  "launch_state": "not_go_for_public_mainnet0",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 validator live-admission execution runbook proof passed"
