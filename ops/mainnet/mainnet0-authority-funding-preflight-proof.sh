#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-authority-funding-preflight.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
CHECKLIST="ops/mainnet/mainnet0-final-public-launch-checklist.current.md"
KEY_RESULT="ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md"
BACKUP="ops/mainnet/mainnet0-key-ceremony-backup-voidkey2-20260523-122135.md"

echo "=== Mainnet-0 authority/funding preflight proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$GONOGO"
test -f "$CHECKLIST"
test -f "$KEY_RESULT"
test -f "$BACKUP"
echo "[ok] required files exist"

echo
echo "=== [2] preflight is plan-only / non-execution ==="
grep -q '^status: plan_only_not_execution$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^funding: false$' "$DOC"
grep -q '^authority_transfer: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'This is not launch approval.' "$DOC"
grep -q 'This does not fund any wallet.' "$DOC"
grep -q 'This does not transfer AdminGate authority.' "$DOC"
grep -q 'This does not transfer UpdateGate authority.' "$DOC"
echo "[ok] preflight is non-executing and non-mutating"

echo
echo "=== [3] future authority/funding requirements are documented ==="
grep -q 'The exact target contract must be named.' "$DOC"
grep -q 'The exact current owner/admin must be recorded.' "$DOC"
grep -q 'The exact new public address must be recorded.' "$DOC"
grep -q 'The live transaction must require a separate explicit operator intent string.' "$DOC"
grep -q 'The live transaction must be recorded by tx hash after execution.' "$DOC"
grep -q 'The exact source wallet must be named.' "$DOC"
grep -q 'The exact destination wallet must be named.' "$DOC"
grep -q 'The exact asset and amount must be recorded.' "$DOC"
grep -q 'Funding must not imply launch approval.' "$DOC"
echo "[ok] future authority/funding requirements documented"

echo
echo "=== [4] completed prerequisites are recorded ==="
grep -q 'Key ceremony public addresses are recorded.' "$DOC"
grep -q 'Key ceremony public artifact is gitleaks-clean.' "$DOC"
grep -q 'VOIDKEY2 encrypted backup receipt is recorded.' "$DOC"
grep -q 'Post-key-backup launch checklist is green.' "$DOC"
grep -q '^result_status: completed_public_addresses_only$' "$KEY_RESULT"
grep -q '^status: backup_verified$' "$BACKUP"
grep -q '^backup_verified_sha256: true$' "$BACKUP"
echo "[ok] key ceremony and backup prerequisites recorded"

echo
echo "=== [5] launch/funding/authority remain blocked ==="
grep -q '^decision: NO_GO$' "$GONOGO"
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
grep -q '^money_step: last$' "$GONOGO"
grep -q '^launch_approval: false$' "$CHECKLIST"
grep -q '^mutation_allowed: false$' "$CHECKLIST"
grep -q '^money_step: last$' "$CHECKLIST"
echo "[ok] launch/funding/authority remain blocked"

echo
echo "=== [6] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-authority-funding-preflight-ready.json
python3 - /tmp/void-authority-funding-preflight-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "authority_funding_preflight": "green",
  "status": "plan_only_not_execution",
  "launch_approval": False,
  "mutation_allowed": False,
  "funding": False,
  "authority_transfer": False,
  "money_step": "last",
  "requires_future_operator_intent": True,
})
PY

echo
echo "[ok] Mainnet-0 authority/funding preflight proof passed"
