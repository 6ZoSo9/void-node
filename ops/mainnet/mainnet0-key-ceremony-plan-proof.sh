#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-key-ceremony-plan.current.md"
BASELINE="ops/mainnet/mainnet0-current-baseline.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 key ceremony plan proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$BASELINE"
test -f "$GONOGO"
echo "[ok] required files exist"

echo
echo "=== [2] plan-only / non-mutating checks ==="
grep -q '^status: planned_not_executed$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'It does not authorize any live mutation' "$DOC"
grep -q 'It does not perform the key ceremony' "$DOC"
grep -q 'NO-GO' "$DOC"
echo "[ok] key ceremony plan is explicitly plan-only"

echo
echo "=== [3] required key roles are documented ==="
grep -q 'Premine treasury wallets' "$DOC"
grep -q 'AdminGate masterKey' "$DOC"
grep -q 'UpdateGate signer set' "$DOC"
grep -q 'launch-critical operator signer' "$DOC"
grep -q 'cold backup signer' "$DOC"
grep -q 'Devnet, testnet, demo, Anvil' "$DOC"
grep -q 'must never be reused for Mainnet-0' "$DOC"
echo "[ok] key roles and no-reuse rule are documented"

echo
echo "=== [4] backup requirements are documented ==="
grep -q 'LUKS-encrypted USB backup' "$DOC"
grep -q 'Optional hardware wallet backup' "$DOC"
grep -q 'Separate physical storage location' "$DOC"
grep -q 'Verification that backups can be opened' "$DOC"
echo "[ok] backup requirements are documented"

echo
echo "=== [5] launch docs still NO-GO ==="
grep -q '^status: current_baseline_cross_box_proven$' "$BASELINE"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$BASELINE"
grep -q '^launch_approval: false$' "$BASELINE"
grep -q '^mutation_allowed: false$' "$BASELINE"
grep -q '^decision: NO_GO$' "$GONOGO"
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
echo "[ok] baseline and go/no-go docs remain fail-closed"

echo
echo "=== [6] no obvious secret material patterns in plan ==="
python3 - "$DOC" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text()

patterns = {
    "hex_private_key": r"(?<![A-Fa-f0-9])0x[A-Fa-f0-9]{64}(?![A-Fa-f0-9])",
    "raw_64_hex": r"(?<![A-Fa-f0-9])[A-Fa-f0-9]{64}(?![A-Fa-f0-9])",
    "pem_private_key": r"BEGIN [A-Z ]*PRIVATE KEY",
    "json_keystore_crypto": r'"crypto"\s*:\s*\{',
}

hits = {}
for name, pat in patterns.items():
    found = re.findall(pat, text, flags=re.IGNORECASE)
    if found:
        hits[name] = found[:3]

assert not hits, hits
print("[ok] no obvious secret material patterns found")
PY

echo
echo "=== [7] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-key-ceremony-plan-ready.json
echo
python3 - /tmp/void-key-ceremony-plan-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [8] summary ==="
python3 - <<'PY'
print({
  "key_ceremony_plan": "planned_not_executed",
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "fresh_mainnet_keys_required": True,
  "devnet_key_reuse_allowed": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 key ceremony plan proof passed"
