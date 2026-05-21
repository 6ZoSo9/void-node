#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-public-release-hygiene.current.md"
BASELINE="ops/mainnet/mainnet0-current-baseline.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
KEY_PLAN="ops/mainnet/mainnet0-key-ceremony-plan.current.md"
KEY_TEMPLATE="ops/mainnet/mainnet0-key-ceremony-result.template.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 public release hygiene proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$BASELINE"
test -f "$GONOGO"
test -f "$KEY_PLAN"
test -f "$KEY_TEMPLATE"
echo "[ok] required files exist"

echo
echo "=== [2] plan-only / no-release checks ==="
grep -q '^status: planned_not_released$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'It is not launch approval' "$DOC"
grep -q 'It is not a release artifact' "$DOC"
grep -q 'NO-GO' "$DOC"
echo "[ok] public release hygiene is explicitly plan-only"

echo
echo "=== [3] current proven baseline recorded ==="
grep -q 'current_cross_box_commit: e7b01dca' "$DOC"
grep -q 'current_cross_box_tag: ckpt-mainnet0-key-ceremony-result-template-green-20260521-024745' "$DOC"
grep -q 'key_ceremony_plan: green' "$DOC"
grep -q 'key_ceremony_result_template: green' "$DOC"
grep -q 'final_gonogo_map: NO_GO' "$DOC"
grep -q 'public_validator_admission: candidate_only_for_mainnet0' "$DOC"
grep -q 'public_active_admission_enabled: false' "$DOC"
echo "[ok] current proven baseline recorded"

echo
echo "=== [4] exclusion requirements documented ==="
grep -q '.secrets/' "$DOC"
grep -q 'private key files' "$DOC"
grep -q 'mnemonic or seed phrase files' "$DOC"
grep -q 'keystore JSON' "$DOC"
grep -q 'passphrase files' "$DOC"
grep -q 'wallet files' "$DOC"
grep -q 'runtime private artifacts' "$DOC"
grep -q 'cache/' "$DOC"
grep -q 'out/' "$DOC"
grep -q 'node_modules/' "$DOC"
echo "[ok] exclusion requirements documented"

echo
echo "=== [5] existing launch/key docs still fail closed ==="
grep -q '^status: current_baseline_cross_box_proven$' "$BASELINE"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$BASELINE"
grep -q '^launch_approval: false$' "$BASELINE"
grep -q '^decision: NO_GO$' "$GONOGO"
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^status: planned_not_executed$' "$KEY_PLAN"
grep -q '^launch_approval: false$' "$KEY_PLAN"
grep -q '^status: template_only$' "$KEY_TEMPLATE"
grep -q '^result_status: not_executed$' "$KEY_TEMPLATE"
grep -q '^contains_secret_material: false$' "$KEY_TEMPLATE"
echo "[ok] existing docs remain fail-closed"

echo
echo "=== [6] no obvious secret material patterns in hygiene doc ==="
python3 - "$DOC" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text()

patterns = {
    "hex_private_key_64": r"(?<![A-Fa-f0-9])0x[A-Fa-f0-9]{64}(?![A-Fa-f0-9])",
    "raw_64_hex": r"(?<![A-Fa-f0-9])[A-Fa-f0-9]{64}(?![A-Fa-f0-9])",
    "pem_private_key_block": r"BEGIN [A-Z ]*PRIVATE KEY",
    "json_keystore_crypto": r'"crypto"\s*:\s*\{',
    "private_key_assignment": r"(?i)\bprivate[_-]?key\s*[:=]",
    "mnemonic_assignment": r"(?i)\bmnemonic\s*[:=]",
    "seed_phrase_assignment": r"(?i)\bseed[_ -]?phrase\s*[:=]",
    "passphrase_assignment": r"(?i)\bpassphrase\s*[:=]",
}

hits = {}
for name, pat in patterns.items():
    found = re.findall(pat, text, flags=re.IGNORECASE)
    if found:
        hits[name] = found[:3]

assert not hits, hits
print("[ok] no obvious secret-like assignment or key patterns found")
PY

echo
echo "=== [7] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-public-release-hygiene-ready.json
echo
python3 - /tmp/void-public-release-hygiene-ready.json <<'PY'
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
  "public_release_hygiene": "planned_not_released",
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "public_validator_admission": "candidate_only_for_mainnet0",
  "public_active_admission_enabled": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 public release hygiene proof passed"
