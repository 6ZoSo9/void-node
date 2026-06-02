#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

FAQ="docs/public/mainnet0-faq.md"
INDEX="docs/public/README.md"
ROOT_README="README.md"
STATUS_DOC="docs/public/mainnet0-current-public-status.md"
WHITEPAPER="docs/public/void-network-whitepaper.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 public FAQ proof ==="

echo
echo "=== [1] required files ==="
for f in "$FAQ" "$INDEX" "$ROOT_README" "$STATUS_DOC" "$WHITEPAPER" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] FAQ identity/status ==="
grep -q '^# VOID Mainnet-0 FAQ$' "$FAQ"
grep -q '^status: public_mainnet0_live$' "$FAQ"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$FAQ"
grep -q 'current_public_status_checkpoint: eb01fe8e / ckpt-root-readme-current-public-status-green-20260524-104733' "$FAQ"
grep -q 'whitepaper_checkpoint: 9067695b / ckpt-mainnet0-whitepaper-v1-green-20260524-102511' "$FAQ"
grep -q 'public_release_bundle_checkpoint: 2865819a / ckpt-public-release-bundle-whitepaper-green-20260524-103149' "$FAQ"
echo "[ok] FAQ identity and checkpoints present"

echo
echo "=== [3] user-facing topics ==="
grep -q '## What is VOID Network?' "$FAQ"
grep -q '## Is VOID Mainnet-0 live?' "$FAQ"
grep -q '## How do I run a node?' "$FAQ"
grep -q '## Can I become a validator right now?' "$FAQ"
grep -q '## Can I buy VOID?' "$FAQ"
grep -q '## What are Work Credits?' "$FAQ"
grep -q '## What is DataNet?' "$FAQ"
grep -q '## What is VPod?' "$FAQ"
grep -q '## What is Obelisk Agent?' "$FAQ"
grep -q '## What are the biggest risks?' "$FAQ"
echo "[ok] FAQ topics present"

echo
echo "=== [4] guardrails ==="
grep -q 'Public active validator admission remains disabled.' "$FAQ"
grep -q 'Public validator registration remains candidate/waiting only.' "$FAQ"
grep -q 'Vault126 onboarding has not been executed.' "$FAQ"
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' "$FAQ"
grep -q 'Future treasury spend remains separately guarded.' "$FAQ"
grep -q 'Payment confirmation does not equal VOID sent.' "$FAQ"
grep -q 'Public registration does not instantly make you an active validator.' "$FAQ"
echo "[ok] FAQ guardrails present"

echo
echo "=== [5] docs links agree ==="
grep -q 'mainnet0-faq.md' "$INDEX"
grep -q 'docs/public/mainnet0-faq.md' "$ROOT_README"
grep -q '^status: public_mainnet0_live$' "$STATUS_DOC"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^status: public_mainnet0_live$' "$STATUS"
echo "[ok] public docs links agree"

echo
echo "=== [6] dependent proofs ==="
make mainnet0-current-public-status-proof
make mainnet0-whitepaper-proof
make mainnet0-status-smoke

echo
echo "=== [7] no obvious secret material in FAQ ==="
python3 - "$FAQ" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text()
patterns = {
    "pem_private_key_block": r"BEGIN [A-Z ]*PRIVATE KEY",
    "private_key_assignment": r"(?i)\bprivate[_-]?key\s*[:=]\s*[^\s]+",
    "mnemonic_assignment": r"(?i)\bmnemonic\s*[:=]\s*[^\n]+",
    "seed_phrase_assignment": r"(?i)\bseed[_ -]?phrase\s*[:=]\s*[^\n]+",
    "passphrase_assignment": r"(?i)\bpassphrase\s*[:=]\s*[^\n]+",
    "json_keystore_crypto": r'"crypto"\s*:\s*\{',
}
hits = []
for name, pat in patterns.items():
    for m in re.finditer(pat, text):
        line = text.count("\n", 0, m.start()) + 1
        hits.append((line, name))
if hits:
    print(hits)
    raise SystemExit(1)
print("[ok] no obvious secret-like assignments, PEM private keys, or keystore blocks found")
PY

echo
echo "=== [8] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-public-faq-ready.json
echo
python3 - /tmp/void-public-faq-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "public_faq": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "validator_admission": "candidate_waiting_only",
  "buy_void": "guarded",
  "treasury": "future_spend_separately_guarded",
  "datanet_wc_obelisk": "documented"
})
PY


echo
echo "=== [network troubleshooting FAQ] ==="
grep -q 'node-network-troubleshooting.md' docs/public/mainnet0-faq.md
grep -q 'ready:true' docs/public/mainnet0-faq.md
grep -q 'local host/network issue' docs/public/mainnet0-faq.md
grep -q 'does not mutate chain state' docs/public/mainnet0-faq.md
echo "[ok] network troubleshooting FAQ present"

echo "[ok] Mainnet-0 public FAQ proof passed"
