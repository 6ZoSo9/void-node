#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-public-release-hygiene.current.md"
BASELINE="ops/mainnet/mainnet0-current-baseline.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
PUBLIC_INDEX="docs/public/README.md"
ROOT_README="README.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 public release hygiene proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$BASELINE" "$GONOGO" "$STATUS" "$PUBLIC_INDEX" "$ROOT_README"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] public-live release hygiene checks ==="
grep -q '^status: public_live_release_hygiene_green$' "$DOC"
grep -q '^launch_state: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^launch_approval: true$' "$DOC"
grep -q '^mutation_allowed_scope: launch_state_public_surface_status_only$' "$DOC"
grep -q '^money_step: ops_seed_complete_future_spend_guarded$' "$DOC"
grep -q 'It does not authorize publication of secret-bearing files.' "$DOC"
grep -q 'It does not authorize additional treasury spend.' "$DOC"
echo "[ok] public release hygiene is public-live and still guarded"

echo
echo "=== [3] current proven baseline recorded ==="
grep -q 'current_cross_box_commit: 6afa564c' "$DOC"
grep -q 'current_cross_box_tag: ckpt-root-readme-public-docs-green-20260524-084138' "$DOC"
grep -q 'final_gonogo_map: GO_PUBLIC_MAINNET0' "$DOC"
grep -q 'public_validator_admission: candidate_only_for_mainnet0' "$DOC"
grep -q 'public_active_admission_enabled: false' "$DOC"
grep -q 'vault126_onboarding_executed: false' "$DOC"
grep -q 'future_treasury_spend: separately_guarded' "$DOC"
echo "[ok] current public-live baseline recorded"

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
echo "=== [5] active public-live docs agree ==="
grep -q '^launch_state: public_mainnet0_live$' "$BASELINE"
grep -q '^launch_approval: true$' "$BASELINE"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$GONOGO"
grep -q '^launch_approval: true$' "$GONOGO"
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q 'This public launch state does not authorize public active validator admission' "$STATUS"
grep -q 'docs/public/README.md' "$ROOT_README"
grep -q 'Public active validator admission remains disabled.' "$PUBLIC_INDEX"
echo "[ok] active public-live docs agree"

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
echo "=== [7] public onboarding/docs proof ==="
make mainnet0-public-onboarding-pack-proof

echo
echo "=== [8] current baseline/go-no-go/status proofs ==="
make mainnet0-current-baseline-proof
make mainnet0-final-gonogo-map-proof
make mainnet0-status-smoke

echo
echo "=== [9] sanitized public release tree / gitleaks ==="
OUT_BASE="${OUT_BASE:-/tmp/void-public-release-export}" bash ops/security/build-public-release-tree.sh

echo
echo "=== [10] node ready ==="
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
echo "=== [11] summary ==="
python3 - <<'PY'
print({
  "public_release_hygiene": "public_live_release_hygiene_green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "launch_approval": True,
  "mutation_allowed_scope": "launch_state_public_surface_status_only",
  "public_validator_admission": "candidate_only_for_mainnet0",
  "public_active_admission_enabled": False,
  "vault126_onboarding_executed": False,
  "future_treasury_spend": "separately_guarded"
})
PY

echo
echo "[ok] Mainnet-0 public release hygiene proof passed"
