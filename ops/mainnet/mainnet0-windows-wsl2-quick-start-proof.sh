#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/windows-wsl2-quick-start.md"
QUICK="docs/public/quick-start.md"
INDEX="docs/public/README.md"
ROOT_README="README.md"
STATUS_DOC="docs/public/mainnet0-current-public-status.md"
FAQ="docs/public/mainnet0-faq.md"
WHITEPAPER="docs/public/void-network-whitepaper.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 Windows WSL2 quick-start proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$QUICK" "$INDEX" "$ROOT_README" "$STATUS_DOC" "$FAQ" "$WHITEPAPER" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] WSL2 doc identity/status ==="
grep -q '^# VOID Mainnet-0 Windows WSL2 Quick Start$' "$DOC"
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q 'quick_start_checkpoint: 0635c606 / ckpt-mainnet0-quick-start-green-20260524-111319' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.' "$DOC"
echo "[ok] WSL2 doc identity and status present"

echo
echo "=== [3] WSL2 install/readiness path ==="
grep -q 'wsl --install' "$DOC"
grep -q 'wsl --install -d Ubuntu' "$DOC"
grep -q 'sudo apt update' "$DOC"
grep -q 'sudo apt install -y git curl build-essential' "$DOC"
grep -q 'git clone https://github.com/6ZoSo9/void-node.git' "$DOC"
grep -q 'npm install' "$DOC"
grep -q 'npm run build' "$DOC"
grep -q 'curl -fsS http://127.0.0.1:4100/__void/ready.json' "$DOC"
grep -q 'http://127.0.0.1:4100/participant' "$DOC"
grep -q 'ready=true' "$DOC"
grep -q 'gap=0' "$DOC"
grep -q 'txroot_live=1' "$DOC"
echo "[ok] WSL2 install/readiness path present"

echo
echo "=== [4] guardrails ==="
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
grep -q 'Do not send blind deposits.' "$DOC"
grep -q 'For serious long-running node operation, use a dedicated Linux machine.' "$DOC"
echo "[ok] WSL2 guardrails present"

echo
echo "=== [5] docs links agree ==="
grep -q 'windows-wsl2-quick-start.md' "$INDEX"
grep -q 'docs/public/windows-wsl2-quick-start.md' "$ROOT_README"
grep -q '^status: public_mainnet0_live$' "$QUICK"
grep -q '^status: public_mainnet0_live$' "$STATUS_DOC"
grep -q '^status: public_mainnet0_live$' "$FAQ"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^status: public_mainnet0_live$' "$STATUS"
echo "[ok] docs links agree"

echo
echo "=== [6] dependent proofs ==="
make mainnet0-quick-start-proof
make mainnet0-public-faq-proof
make mainnet0-current-public-status-proof
make mainnet0-status-smoke

echo
echo "=== [7] no obvious secret material in WSL2 doc ==="
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
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-windows-wsl2-quick-start-ready.json
echo
python3 - /tmp/void-windows-wsl2-quick-start-ready.json <<'PY'
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
  "windows_wsl2_quick_start": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "wsl2_path": "documented",
  "participant_page": "documented",
  "guardrails": "present"
})
PY

echo "[ok] Mainnet-0 Windows WSL2 quick-start proof passed"
