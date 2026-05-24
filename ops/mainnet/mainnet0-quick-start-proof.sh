#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/quick-start.md"
INDEX="docs/public/README.md"
ROOT_README="README.md"
STATUS_DOC="docs/public/mainnet0-current-public-status.md"
FAQ="docs/public/mainnet0-faq.md"
WHITEPAPER="docs/public/void-network-whitepaper.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 quick-start proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$INDEX" "$ROOT_README" "$STATUS_DOC" "$FAQ" "$WHITEPAPER" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] quick-start identity/status ==="
grep -q '^# VOID Mainnet-0 Quick Start$' "$DOC"
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q 'current_public_status_checkpoint: 30e9d994 / ckpt-mainnet0-public-faq-green-20260524-105421' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.' "$DOC"
echo "[ok] quick-start identity and status present"

echo
echo "=== [3] install/readiness path ==="
grep -q 'git clone https://github.com/6ZoSo9/void-node.git' "$DOC"
grep -q 'cd void-node' "$DOC"
grep -q 'npm install' "$DOC"
grep -q 'npm run build' "$DOC"
grep -q 'curl -fsS http://127.0.0.1:4100/__void/ready.json' "$DOC"
grep -q 'ready=true' "$DOC"
grep -q 'gap=0' "$DOC"
grep -q 'txroot_live=1' "$DOC"
grep -q 'http://127.0.0.1:4100/participant' "$DOC"
echo "[ok] quick-start install/readiness path present"

echo
echo "=== [4] guardrails ==="
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
grep -q 'Do not send blind deposits.' "$DOC"
grep -q 'Use WSL2 for Mainnet-0.' "$DOC"
echo "[ok] quick-start guardrails present"

echo
echo "=== [5] docs links agree ==="
grep -q 'quick-start.md' "$INDEX"
grep -q 'docs/public/quick-start.md' "$ROOT_README"
grep -q '^status: public_mainnet0_live$' "$STATUS_DOC"
grep -q '^status: public_mainnet0_live$' "$FAQ"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^status: public_mainnet0_live$' "$STATUS"
echo "[ok] docs links agree"

echo
echo "=== [6] dependent proofs ==="
make mainnet0-public-faq-proof
make mainnet0-current-public-status-proof
make mainnet0-status-smoke

echo
echo "=== [7] no obvious secret material in quick-start ==="
python3 - "$DOC" <<'PY'
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
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-quick-start-ready.json
echo
python3 - /tmp/void-quick-start-ready.json <<'PY'
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
  "quick_start": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "install_path": "documented",
  "participant_page": "documented",
  "guardrails": "present"
})
PY

echo "[ok] Mainnet-0 quick-start proof passed"
