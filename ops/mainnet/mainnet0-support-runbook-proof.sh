#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/support-runbook.md"
INDEX="docs/public/README.md"
ROOT_README="README.md"
QUICK="docs/public/quick-start.md"
WSL2="docs/public/windows-wsl2-quick-start.md"
FAQ="docs/public/mainnet0-faq.md"
STATUS_DOC="docs/public/mainnet0-current-public-status.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 support runbook proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$INDEX" "$ROOT_README" "$QUICK" "$WSL2" "$FAQ" "$STATUS_DOC" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] support runbook identity/status ==="
grep -q '^# VOID Mainnet-0 Public Support Runbook$' "$DOC"
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^current_public_status_checkpoint: 2f71d8b3 / ckpt-current-public-status-quickstarts-green-20260524-121756$' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.' "$DOC"
echo "[ok] support runbook identity/status present"

echo
echo "=== [3] support checks present ==="
grep -q 'curl -fsS http://127.0.0.1:4100/__void/ready.json' "$DOC"
grep -q 'http://127.0.0.1:4100/participant' "$DOC"
grep -q 'git status --short' "$DOC"
grep -q 'git rev-parse --short HEAD' "$DOC"
grep -q 'git describe --tags --always --dirty' "$DOC"
grep -q 'npm install' "$DOC"
grep -q 'npm run build' "$DOC"
grep -q 'wsl --status' "$DOC"
grep -q 'node --version' "$DOC"
grep -q 'npm --version' "$DOC"
echo "[ok] support checks present"

echo
echo "=== [4] no-secrets policy ==="
grep -q 'Do not ask for secrets.' "$DOC"
grep -q 'Never ask a user to share:' "$DOC"
grep -q 'Do not ask for wallet secrets.' "$DOC"
grep -q 'Do not collect secrets.' "$DOC"
echo "[ok] no-secrets support policy present"

echo
echo "=== [5] guardrails ==="
grep -q 'Buy VOID is guarded.' "$DOC"
grep -q 'Payment confirmation does not mean VOID has been sent.' "$DOC"
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
echo "[ok] support guardrails present"

echo
echo "=== [6] docs links agree ==="
grep -q 'support-runbook.md' "$INDEX"
grep -q 'docs/public/support-runbook.md' "$ROOT_README"
grep -q '^status: public_mainnet0_live$' "$QUICK"
grep -q '^status: public_mainnet0_live$' "$WSL2"
grep -q '^status: public_mainnet0_live$' "$FAQ"
grep -q '^status: public_mainnet0_live$' "$STATUS_DOC"
grep -q '^status: public_mainnet0_live$' "$STATUS"
echo "[ok] docs links agree"

echo
echo "=== [7] dependent proofs ==="
make mainnet0-current-public-status-proof
make mainnet0-windows-wsl2-quick-start-proof
make mainnet0-quick-start-proof
make mainnet0-public-faq-proof
make mainnet0-status-smoke

echo
echo "=== [8] no obvious secret material in support runbook ==="
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
echo "=== [9] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-support-runbook-ready.json
echo
python3 - /tmp/void-support-runbook-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [10] summary ==="
python3 - <<'PY'
print({
  "support_runbook": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "node_support": "documented",
  "wsl2_support": "documented",
  "no_secrets_policy": "present",
  "guardrails": "present"
})
PY

echo "[ok] Mainnet-0 support runbook proof passed"
