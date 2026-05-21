#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-key-ceremony-result.template.md"
PLAN="ops/mainnet/mainnet0-key-ceremony-plan.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
BASELINE="ops/mainnet/mainnet0-current-baseline.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 key ceremony result template proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$PLAN"
test -f "$GONOGO"
test -f "$BASELINE"
echo "[ok] required files exist"

echo
echo "=== [2] template-only / non-mutating checks ==="
grep -q '^status: template_only$' "$DOC"
grep -q '^result_status: not_executed$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q '^records_public_addresses_only: true$' "$DOC"
grep -q '^contains_secret_material: false$' "$DOC"
grep -q 'It is not launch approval' "$DOC"
grep -q 'It must record public addresses only' "$DOC"
grep -q 'NO-GO' "$DOC"
echo "[ok] result template is explicitly non-mutating and not completed"

echo
echo "=== [3] dependency checkpoints are recorded ==="
grep -q 'key_ceremony_plan_commit: ceb1835c' "$DOC"
grep -q 'key_ceremony_plan_tag: ckpt-mainnet0-key-ceremony-plan-green-20260521-023326' "$DOC"
grep -q 'final_gonogo_map_commit: 5e665158' "$DOC"
grep -q 'current_baseline_pointer_commit: bd373e29' "$DOC"
echo "[ok] dependency checkpoints recorded"

echo
echo "=== [4] public-address-only fields are present ==="
grep -q 'premine_treasury_primary_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'premine_treasury_network_pool_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'admingate_master_key_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'updategate_signer_1_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'updategate_signer_2_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'updategate_signer_3_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'launch_operator_signer_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'cold_backup_signer_1_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'cold_backup_signer_2_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
grep -q 'cold_backup_signer_3_public_address: TBD_PUBLIC_ADDRESS_ONLY' "$DOC"
echo "[ok] required public-address fields exist"

echo
echo "=== [5] secret-pattern guard for template ==="
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
 for_name = None
for name, pat in patterns.items():
    found = re.findall(pat, text, flags=re.IGNORECASE)
    if found:
        hits[name] = found[:3]

assert not hits, hits
print("[ok] no secret-like assignment or key patterns found")
PY

echo
echo "=== [6] existing key plan and launch docs still NO-GO ==="
grep -q '^status: planned_not_executed$' "$PLAN"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$PLAN"
grep -q '^launch_approval: false$' "$PLAN"
grep -q '^decision: NO_GO$' "$GONOGO"
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
grep -q '^status: current_baseline_cross_box_proven$' "$BASELINE"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$BASELINE"
echo "[ok] existing docs remain fail-closed"

echo
echo "=== [7] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-key-result-template-ready.json
echo
python3 - /tmp/void-key-result-template-ready.json <<'PY'
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
  "key_ceremony_result_template": "green",
  "result_status": "not_executed",
  "records_public_addresses_only": True,
  "contains_secret_material": False,
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 key ceremony result template proof passed"
